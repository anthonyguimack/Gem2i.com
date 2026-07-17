"""gem2i Phase-4/5 historical-data ETL — STAGE 1 (transform).

Fans the legacy per-event child tables into the `gem_events` sub-docs the
Phase-4/5 engines already read, and archives the legacy transaction + points
history. Reads the restored `gem2i_etl_src` MariaDB; writes to
`reference/local-only/etl_out/`:

  gem_events_history.jsonl   per event: tiers / guest_list / points / payment
                             / legacy_prices (only events that have any)
  gem_transactions_hist.jsonl  events_paypal_transactions -> gem_transactions
                               archive rows (tickets + guest passes)
  gem_points_history.jsonl     system_points_actions_members_history
  gem_points_actions.jsonl     the 16-action catalog -> gem_config

Mapping notes (schema verified against the live dump 2026-07-17):
  * tiers.{key}.price: legacy selling prices are DATED LADDERS (events_prices
    man/woman steps 1..5). The rebuilt model is single-price; we take the last
    non-zero man step (final price), falling back to the woman ladder, and keep
    every non-zero step under legacy_prices for archaeology.
  * cost/stock per tier from events_cost; guest_list.stock = stock_guest_list.
  * guest-list benefits: events_guest_list_benefit(+_additional, +_detail) per
    member type -> benefits[] with our deterministic member_types ids.
  * payment: events.id_payment -> events_payment_accounts + currency table
    (PEN/EUR/USD/ARS). Provider was PayPal — archived as such; live checkout
    is Stripe (D3), so only `currency` feeds the rebuilt flow.
  * transactions: type_ticket 'GUEST LIST' -> kind guest_pass, else ticket
    (tier from the label); canceled from guest_list_status/epass_status;
    economics {cost?, profit, commissions[6]} from the row itself.
  * events_members_waiting_list is empty in the dump — nothing to port.

Run LOCALLY:  python scripts/gem2i_etl_history.py
"""
import json
import uuid
from datetime import date, datetime
from pathlib import Path

import pymysql

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "reference" / "local-only" / "etl_out"
GEM2I_NS = uuid.UUID("6d2a1f5e-0e3b-5c4a-9b7d-0a1a12000000")

TIERS = ["admission", "eprice", "vip", "gold", "ultra", "platinium"]
TIER_LABELS = {"admission": "G. Admission", "eprice": "ePrice", "vip": "VIP",
               "gold": "Gold", "ultra": "Ultra", "platinium": "Platinium"}
# type_ticket label -> tier key (as written by event_payment.php)
TICKET_LABEL_TO_TIER = {"G. Admission Price": "admission", "ePrice": "eprice",
                        "Vip Price": "vip", "Gold Price": "gold",
                        "Ultra Price": "ultra", "Platinium Price": "platinium"}

ZERO_DT = "0000-00-00 00:00:00"


def det_id(collection: str, legacy_id) -> str:
    return str(uuid.uuid5(GEM2I_NS, f"{collection}:{legacy_id}"))


def clean(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def dt(v):
    """Datetime -> ISO, dropping MySQL zero-dates."""
    if v in (None, "", ZERO_DT):
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return str(v)


def num(v):
    return float(v) if v is not None else 0.0


def jdefault(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    raise TypeError(f"not serializable: {type(o)}")


def write_ndjson(name, docs):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.jsonl"
    with path.open("w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False, default=jdefault) + "\n")
    print(f"  {name:24s} {len(docs):5d} docs -> {path.relative_to(ROOT)}")
    return docs


# ---------------------------------------------------------------- extractors
def ladder(row, tier):
    """Non-zero price steps for a tier, man ladder then woman ladder."""
    out = {"man": [], "woman": []}
    for sex in ("man", "woman"):
        for i in range(1, 6):
            price = num(row.get(f"{tier}_{sex}{i}"))
            until = dt(row.get(f"{tier}_{sex}{i}_date"))
            if price > 0:
                out[sex].append({"price": price, "until": until})
    return {k: v for k, v in out.items() if v}


def final_price(steps: dict) -> float:
    for sex in ("man", "woman"):
        if steps.get(sex):
            return steps[sex][-1]["price"]
    return 0.0


def etl_event_subdocs(cur):
    cur.execute("SELECT * FROM events_cost")
    costs = {r["id_event"]: r for r in cur.fetchall()}
    cur.execute("SELECT * FROM events_prices")
    prices = {r["id_event"]: r for r in cur.fetchall()}

    # benefits: benefit (free_until) + benefit_additional (title/desc) per (event, member_type)
    cur.execute("SELECT * FROM events_guest_list_benefit")
    benefits = {}
    for r in cur.fetchall():
        benefits[(r["id_event"], r["id_member_type"])] = {"free_until": dt(r["free_until"])}
    cur.execute("SELECT * FROM events_guest_list_detail")
    for r in cur.fetchall():
        benefits.setdefault((r["id_event"], r["id_member_type"]),
                            {"free_until": dt(r["free_until"])})
    cur.execute("SELECT * FROM events_guest_list_benefit_additional")
    for r in cur.fetchall():
        b = benefits.setdefault((r["id_event"], r["id_member_type"]), {})
        b["additional_until"] = dt(r["free_until"])
        b["additional_title"] = clean(r["title"])
        b["additional_desc"] = clean(r["description"])

    cur.execute("SELECT * FROM events_reward_points_eticket")
    pts_et = {r["id_event"]: r for r in cur.fetchall()}
    cur.execute("SELECT * FROM events_reward_points_guest_list")
    pts_gl = {r["id_event"]: r for r in cur.fetchall()}

    cur.execute("SELECT p.id_payment, p.account, p.payment_gateway_provider, c.currency_code "
                "FROM events_payment_accounts p LEFT JOIN currency c ON c.id_currency=p.id_currency")
    accounts = {r["id_payment"]: r for r in cur.fetchall()}

    cur.execute("SELECT id_range, `range` FROM guest_list_range")
    all_ranges = sorted(int(r["range"]) for r in cur.fetchall())

    cur.execute("SELECT id_event, id_payment, guest_list_additional_quantity, "
                "guest_list_close, free_until FROM events")
    docs = []
    for ev in cur.fetchall():
        lid = ev["id_event"]
        doc = {"legacy_id": lid}

        cost = costs.get(lid)
        price_row = prices.get(lid)
        if cost:
            tiers, legacy_prices = {}, {}
            for t in TIERS:
                steps = ladder(price_row, t) if price_row else {}
                if steps:
                    legacy_prices[t] = steps
                tiers[t] = {"label": TIER_LABELS[t],
                            "price": final_price(steps),
                            "cost": num(cost.get(f"cost_{t}")),
                            "stock": int(cost.get(f"stock_{t}") or 0)}
            if any(v["price"] or v["cost"] or v["stock"] for v in tiers.values()):
                doc["tiers"] = tiers
            if legacy_prices:
                doc["legacy_prices"] = legacy_prices
            if price_row and ladder(price_row, "guest_list"):
                doc.setdefault("legacy_prices", {})["guest_list"] = ladder(price_row, "guest_list")
            doc["transaction_fee"] = {"percentage": num(cost.get("transaction_fee_percentage")),
                                      "fixed": num(cost.get("transaction_fee_fixed"))}

            gl_stock = int(cost.get("stock_guest_list") or 0)
            ev_benefits = [{"member_type_id": det_id("member_types", mt), **b}
                           for (e, mt), b in benefits.items() if e == lid]
            if gl_stock or ev_benefits:
                additional = (ev.get("guest_list_additional_quantity") or "").upper() == "Y"
                doc["guest_list"] = {
                    "stock": gl_stock,
                    "additional_enabled": additional,
                    "ranges": all_ranges if additional else [],
                    "benefits": ev_benefits,
                    "open_until": dt(ev.get("guest_list_close")),
                    "free_until": dt(ev.get("free_until")),
                }

        points = {}
        if lid in pts_et:
            p = pts_et[lid]
            points.update({"purchase": int(p["purchase_for_self"] or 0),
                           "invite_share": int(p["invite_to_purchase_share"] or 0),
                           "legacy_eticket": {k: int(p[k] or 0) for k in
                                              ("purchase_for_self", "purchase_for_a_friend",
                                               "invite_to_purchase_share",
                                               "friend_purchased_via_invite", "each_additional")}})
        if lid in pts_gl:
            p = pts_gl[lid]
            points.update({"guest_list_self": int(p["yourself_points"] or 0),
                           "legacy_guest_list": {k: int(p[k] or 0) for k in
                                                 ("yourself_points", "add_friend_points",
                                                  "invite_friends_points",
                                                  "list_registration_reward_points",
                                                  "list_check_in_reward_points")}})
        if points:
            doc["points"] = points

        acct = accounts.get(ev.get("id_payment"))
        if acct:
            doc["payment"] = {"currency": (acct.get("currency_code") or "usd").lower(),
                              "legacy_provider": "paypal",
                              "legacy_account": clean(acct.get("account"))}

        if len(doc) > 1:
            docs.append(doc)
    return docs


def etl_transactions(cur):
    cur.execute("SELECT * FROM events_paypal_transactions")
    docs = []
    for r in cur.fetchall():
        lid = r["id_transaction"]
        is_guest = (r.get("type_ticket") or "").strip().upper() == "GUEST LIST"
        if is_guest:
            canceled = (r.get("guest_list_status") == "Canceled") or (r.get("status") != "A")
        else:
            canceled = (r.get("epass_status") == "Canceled") or (r.get("status") != "A")
        commissions = [num(r.get(f"ecommissions_level_{i}")) for i in range(6)]
        extra = {k: dt(r.get(k)) if "date" in k else clean(r.get(k)) for k in
                 ("assistance", "assistance_date", "assistance_canceled", "reassign",
                  "ticket_bank", "pay_by", "url_reference_guest_list")
                 if clean(r.get(k)) not in (None, "N", "0")}
        docs.append({
            "id": det_id("gem_transactions", lid), "legacy_id": lid,
            "event_legacy_id": r["id_event"],
            "member_legacy_id": r["id_member"] or None,
            "member_name": " ".join(x for x in (clean(r["first_name"]), clean(r["last_name"])) if x) or None,
            "member_email": (clean(r["email"]) or "").lower() or None,
            "kind": "guest_pass" if is_guest else "ticket",
            "tier": None if is_guest else TICKET_LABEL_TO_TIER.get(clean(r.get("type_ticket"))),
            "tier_label": None if is_guest else clean(r.get("type_ticket")),
            "quantity": int(r.get("quantity") or (1 if is_guest else 1)),
            "amount": num(r.get("amount")), "shipping": num(r.get("shipping")),
            "total": num(r.get("total")),
            "currency": (clean(r.get("currency_code")) or "").lower() or None,
            "status": "canceled" if canceled else "completed",
            "payment": {"provider": "paypal", "txn_id": clean(r.get("transaction")),
                        "account": clean(r.get("account_paypal"))},
            "qr": {"code": clean(r.get("qr_code"))} if clean(r.get("qr_code")) else None,
            "guest_additional": int(r.get("guest_additional") or 0),
            "points": int(r.get("points") or 0),
            "sponsor_legacy_id": r.get("id_sponsor") or None,
            "invited_by": clean(r.get("guest_list_invited_by")),
            "referral": ({"sponsor_legacy_id": r.get("id_sponsor_referral"),
                          "flag": clean(r.get("referral"))}
                         if r.get("id_sponsor_referral") else None),
            "economics": {"profit": num(r.get("profit")), "commissions": commissions},
            "formal_name": clean(r.get("formal_name_id")),
            "legacy": True,
            "legacy_extra": extra or None,
            "created_at": dt(r.get("date_create")),
            "canceled_at": dt(r.get("date_guest_list_canceled")) or dt(r.get("date_epass_canceled"))
                           if canceled else None,
        })
    return docs


def etl_points(cur):
    cur.execute("SELECT id_action, description, points, create_date FROM system_points_actions")
    actions = [{"legacy_id": r["id_action"], "description": clean(r["description"]),
                "points": int(r["points"] or 0)} for r in cur.fetchall()]

    cur.execute("SELECT * FROM system_points_actions_members_history")
    hist = [{
        "id": det_id("gem_points_history", r["id_history"]), "legacy_id": r["id_history"],
        "member_legacy_id": r["id_membership"],
        "action_id": r["id_action"],
        "description": clean(r["description_action"]),
        "points": int(r["points_earned"] or 0),
        "url_reference": clean(r["url_reference"]),
        "transaction_legacy_id": r["id_transaction"] or None,
        "legacy": True,
        "created_at": dt(r["create_date"]),
    } for r in cur.fetchall()]
    return actions, hist


def main():
    conn = pymysql.connect(host="127.0.0.1", user="root", password="", database="gem2i_etl_src",
                           charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)
    with conn.cursor() as cur:
        print("extracting:")
        write_ndjson("gem_events_history", etl_event_subdocs(cur))
        write_ndjson("gem_transactions_hist", etl_transactions(cur))
        actions, hist = etl_points(cur)
        write_ndjson("gem_points_actions", actions)
        write_ndjson("gem_points_history", hist)
    conn.close()
    print(f"\nStage 1 complete -> {OUT_DIR.relative_to(ROOT)}")
    print("Next: scp the .jsonl + scripts/gem2i_load_history.py to the box and run Stage 2.")


if __name__ == "__main__":
    main()
