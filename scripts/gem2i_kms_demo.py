"""KMS demo content for gem2i (2026-10-19) — sections, posts, tags, selections.

Every row carries sample="gem2i_kms_demo" so it can be removed in one go.
Images point at the real legacy gem2i photos already served by beta.

  cd /opt/beta.gem2i.com && backend/venv/bin/python scripts/gem2i_kms_demo.py          # load / refresh
  cd /opt/beta.gem2i.com && backend/venv/bin/python scripts/gem2i_kms_demo.py --remove # delete it all
"""
import os
import re
import sys
import unicodedata
from datetime import datetime, timedelta, timezone

from pymongo import MongoClient

TAG = "gem2i_kms_demo"
U = "https://beta.gem2i.com/api/uploads/gem2i/legacy/"
AUTHOR = {"author_username": "GEM2i Editorial", "author_slug": "gem2i-editorial"}

CATS = [  # name, slug, color, on home
    ("Festivales", "festivales", "#0068B3", 1),
    ("Artistas", "artistas", "#5AAFEA", 1),
    ("Venues", "venues", "#2FBF71", 1),
    ("Industria", "industria", "#E5A93B", 1),
    ("Video", "video", "#E5484D", 0),
]

P = "<p>{}</p>"
LOREM = [
    "La escena electrónica vive una temporada de récords: más fechas, más aforo y públicos que viajan entre continentes para ver a sus artistas.",
    "Hablamos con promotores, artistas y equipos de producción para entender qué cambió y qué viene en los próximos meses.",
    "Los miembros de GEM2i acceden a guest lists, pases QR y entradas con prioridad en los eventos de la red.",
]

# title, category slug, image path, summary, tags, pageviews, post_type, selections
POSTS = [
    ("Ultra Miami a los 25: cómo un festival de playa cambió la industria", "festivales", "images_festivals/photo/1518136932.png",
     "Del primer escenario en Collins Park al circuito global que mueve 170.000 personas por edición.", ["miami", "ultra", "festivales"], 4820, "article", ["slider", "featured"]),
    ("Carl Cox: “la pista sigue siendo el mejor laboratorio”", "artistas", "djs_images/big/1400182806.png",
     "Tres décadas después, el británico sigue probando cada track frente al público antes de editarlo.", ["techno", "entrevista"], 3510, "article", ["featured"]),
    ("Ibiza 2027: los clubes que abren antes", "venues", "venues_view/1404140969.png",
     "Ushuaïa, Hï y Amnesia adelantan sus openings. Qué significa para la temporada.", ["ibiza", "openings"], 2980, "article", ["featured", "breaking"]),
    ("Ticketing con QR: lo que cambia para los promotores", "industria", "images_festivals/photo/1570741257.png",
     "Menos fraude, datos en tiempo real y filas más cortas: el pase digital ya es la norma.", ["ticketing", "guest list"], 2140, "article", ["breaking"]),
    ("Eco Festival: techno sostenible en Ljubljana", "festivales", "images_festivals/photo/1570817505.png",
     "Escenarios solares, cero plástico y un line-up que mira al under europeo.", ["techno", "sostenibilidad"], 1290, "article", []),
    ("Oasis Marrakech vuelve en septiembre", "festivales", "images_festivals/photo/1516128182.png",
     "El festival del desierto confirma fechas y suma un tercer escenario.", ["marrakech", "festivales"], 980, "article", []),
    ("EDC Las Vegas y la economía del gran formato", "festivales", "images_festivals/photo/1517430743.png",
     "Producción, artistas y hospitalidad: cuánto cuesta una noche bajo el cielo eléctrico.", ["las vegas", "edc"], 2650, "article", []),
    ("Maceo Plex, número uno del ranking GEM2i", "artistas", "djs_images/big/1402697498.png",
     "El productor de Florida lidera nuestra lista por segundo año consecutivo.", ["ranking", "house"], 3890, "article", []),
    ("Richie Hawtin y la vuelta al minimal", "artistas", "djs_images/big/1400103527.png",
     "El canadiense presenta un nuevo live con hardware y menos pantallas.", ["minimal", "techno"], 1430, "article", []),
    ("Marco Carola: diez años de Music On", "artistas", "djs_images/big/1402698909.png",
     "La residencia que redefinió los viernes de Ibiza celebra su década.", ["ibiza", "residencias"], 1760, "article", []),
    ("Echostage: el club que convirtió Washington en destino", "venues", "venues_view/1404146545.png",
     "Tres mil personas, sonido de estadio y una programación que compite con Nueva York.", ["washington", "clubes"], 1210, "article", []),
    ("Green Valley, el templo verde de Brasil", "venues", "venues_view/1403884600.png",
     "Por qué el club de Santa Catarina sigue en lo más alto de los rankings.", ["brasil", "clubes"], 1580, "article", []),
    ("Festivales boutique: menos aforo, más margen", "industria", "images_festivals/photo/1569883530.png",
     "Los eventos de 3.000 personas ganan terreno frente a los gigantes.", ["negocio", "festivales"], 870, "article", ["breaking"]),
    ("El costo real de un headliner", "industria", "venues_view/1404149560.png",
     "Fee, rider, viajes y producción: desglosamos una noche de cabeza de cartel.", ["negocio", "artistas"], 2310, "article", []),
    ("Green Valley: una noche desde la cabina", "video", "venues_view/1403884600.png",
     "Video: cómo se vive el pico de la noche detrás del DJ.", ["video", "clubes"], 1950, "video", []),
    ("Entrevista: Marco Carola en Amnesia", "video", "djs_images/big/1402698909.png",
     "Video: doce minutos con el italiano antes de su set de cierre.", ["video", "entrevista"], 1120, "video", []),
    ("Aftermovie: Papaya, Zrće Beach", "video", "venues_view/1404149560.png",
     "Video: el verano croata en tres minutos.", ["video", "croacia"], 760, "video", []),
]


def slugify(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


def next_id(coll):
    d = coll.find_one(sort=[("id", -1)], projection={"id": 1})
    return int((d or {}).get("id") or 0) + 1


def remove(db):
    ids = [p["id"] for p in db.kms_posts.find({"sample": TAG}, {"id": 1})]
    print("selections", db.kms_selections.delete_many({"post_id": {"$in": ids}}).deleted_count)
    for c in ("kms_posts", "kms_categories", "kms_tags"):
        print(c, db[c].delete_many({"sample": TAG}).deleted_count)


def main():
    db = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))[os.environ.get("DB_NAME", "gem2i_cms")]
    remove(db)
    if "--remove" in sys.argv:
        return
    now = datetime.now(timezone.utc)
    cat_ids = {}
    for i, (name, slug, color, home) in enumerate(CATS):
        cid = next_id(db.kms_categories)
        db.kms_categories.insert_one({
            "id": cid, "lang_id": 1, "name": name, "slug": slug, "parent_id": 0, "color": color,
            "block_type": "block-1", "category_order": i + 1, "show_on_homepage": home, "show_on_menu": 1,
            "category_status": 1, "description": None, "keywords": None, "default_image": None,
            "compose_company_logo": 0, "created_at": now.strftime("%Y-%m-%d %H:%M:%S"), "sample": TAG})
        cat_ids[slug] = cid
    seen_tags = set()
    # Interleave the videos (positions 2, 5, 8) so they fall inside the home's
    # "latest 12" and the Video row has something to show.
    arts = [p for p in POSTS if p[6] != "video"]
    vids = [p for p in POSTS if p[6] == "video"]
    ordered = []
    for i, p in enumerate(arts):
        ordered.append(p)
        if i in (1, 3, 5) and vids:
            ordered.append(vids.pop(0))
    ordered += vids
    for i, (title, cat, img, summary, tags, views, ptype, sels) in enumerate(ordered):
        pid = next_id(db.kms_posts)
        created = (now - timedelta(hours=7 * i + 2)).strftime("%Y-%m-%d %H:%M:%S")
        doc = {
            "id": pid, "lang_id": 1, "title": title, "slug": slugify(title), "summary": summary,
            "keywords": ", ".join(tags), "optional_url": None, "show_post_url": 1, "image_description": None,
            "content": "".join(P.format(x) for x in [summary] + LOREM), "doc_css": None,
            "category_id": cat_ids[cat], "image_id": None, "image": None, "image_url": U + img,
            "tier": "public", "related_book_ids": [], "related_company_ids": [], "need_auth": 0,
            "visibility": 1, "post_type": ptype, "status": 1, "is_draft": 0, "is_scheduled": 0,
            "scheduled_at": None, "created_at": created, "updated_at": created,
            "tags": [{"id": None, "tag": t, "slug": slugify(t)} for t in tags],
            "show_right_column": 1, "pageviews": views, **AUTHOR, "author_id_membership": None,
            "user_id": None, "sample": TAG}
        if ptype == "video":
            doc["video_url"] = "https://www.youtube.com/watch?v=vy-k0FopsmY"
            doc["video_embed_code"] = None
        db.kms_posts.insert_one(doc)
        for s in sels:
            db.kms_selections.insert_one({"id": next_id(db.kms_selections), "post_id": pid, "selection_type": s})
        for t in tags:
            sl = slugify(t)
            if sl not in seen_tags and not db.kms_tags.find_one({"tag_slug": sl, "lang_id": 1}):
                db.kms_tags.insert_one({"id": next_id(db.kms_tags), "tag": t, "tag_slug": sl, "lang_id": 1, "sample": TAG})
            seen_tags.add(sl)
    print("categories", len(CATS), "/ posts", len(POSTS), "/ tags", len(seen_tags))


if __name__ == "__main__":
    main()
