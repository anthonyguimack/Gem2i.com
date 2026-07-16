"""Catalog of all transactional emails the platform sends.

Each entry describes:
  - key:          stable identifier stored in the DB (`email_templates.key`)
  - name:         human label shown in the CMS list
  - description:  one-liner so the operator knows when this fires
  - variables:    {placeholder_name: short description}  — these are the
                  `{{placeholder}}` tokens that the rendering helper
                  substitutes into both subject and body before send
  - default_subject / default_body: shipped defaults; an operator can
                  reset to these from the editor
  - sample_values: filled into the Preview view so the operator sees a
                  realistic render even before any email has been sent

Adding a new template:
  1. Add a new entry below.
  2. In the place that calls `send_email_smtp(...)`, replace the inline
     HTML with `await render_and_send(key, settings, to_email, to_name,
     variables={...})` (see `utils/email_render.py`).
  3. Restart the backend → the new template auto-seeds into Mongo.
"""

EMAIL_TEMPLATES: list[dict] = [
    {
        "key": "password_reset",
        "name": "Password Reset",
        "description": "Sent when a member uses 'Forgot password?' on the login page.",
        "variables": {
            "name": "Recipient first name",
            "link": "Single-use reset URL (expires in 30 minutes)",
            "platform_name": "Brand name from CMS Settings",
            "expiry_minutes": "Lifetime of the reset link",
        },
        "default_subject": "Reset your {{platform_name}} password",
        "default_body": (
            "<h2 style=\"margin:0 0 16px;\">Reset your password</h2>"
            "<p>Hello {{name}},</p>"
            "<p>We received a request to reset your password. "
            "Click the button below to choose a new one — the link expires "
            "in {{expiry_minutes}} minutes and can only be used once.</p>"
            "<p style=\"margin:32px 0;\"><a href=\"{{link}}\" "
            "class=\"btn\">Reset my password</a></p>"
            "<p style=\"font-size:13px;color:#6b7280;\">If you didn't request this, "
            "you can safely ignore this email.</p>"
        ),
        "sample_values": {
            "name": "Alex",
            "link": "https://example.com/my-account/reset-password?token=abc123",
            "platform_name": "Legacy",
            "expiry_minutes": "30",
        },
    },
    {
        "key": "welcome_register",
        "name": "Welcome — Member Registration",
        "description": "Sent after a member completes the standard /my-account/register form.",
        "variables": {
            "name": "Recipient first name",
            "last_name": "Recipient last name",
            "membership_id": "Assigned membership ID (e.g. AUX-101)",
            "username": "Login username",
            "platform_name": "Brand name from CMS Settings",
        },
        "default_subject": "Welcome to {{platform_name}}!",
        "default_body": (
            "<h2 style=\"margin:0 0 16px;\">Welcome to {{platform_name}}!</h2>"
            "<p>Hello {{name}},</p>"
            "<p>Your account has been created successfully.</p>"
            "<table style=\"margin:16px 0;border-collapse:collapse;\">"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Membership ID</td>"
            "<td style=\"padding:6px 12px;\"><strong>{{membership_id}}</strong></td></tr>"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Username</td>"
            "<td style=\"padding:6px 12px;\"><strong>{{username}}</strong></td></tr>"
            "</table>"
            "<p>Sign in any time at the membership portal to access your area.</p>"
        ),
        "sample_values": {
            "name": "Alex",
            "last_name": "Reyes",
            "membership_id": "AUX-101",
            "username": "alex.reyes",
            "platform_name": "Legacy",
        },
    },
    {
        "key": "welcome_enrollment",
        "name": "Welcome — Membership Enrollment",
        "description": "Sent after the 4-step membership enrollment, includes the auto-generated password.",
        "variables": {
            "first_name": "Recipient first name",
            "last_name": "Recipient last name",
            "email": "Login email",
            "password": "Auto-generated password (one-time, please change after login)",
            "membership_id": "Assigned membership ID",
            "platform_name": "Brand name from CMS Settings",
        },
        "default_subject": "Welcome to {{platform_name}} — your credentials",
        "default_body": (
            "<h2 style=\"margin:0 0 16px;\">Welcome to {{platform_name}}!</h2>"
            "<p>Dear {{first_name}} {{last_name}},</p>"
            "<p>Your membership application has been received. Use the credentials "
            "below to sign in for the first time:</p>"
            "<table style=\"margin:16px 0;border-collapse:collapse;\">"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Email</td>"
            "<td style=\"padding:6px 12px;\"><strong>{{email}}</strong></td></tr>"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Password</td>"
            "<td style=\"padding:6px 12px;\"><strong>{{password}}</strong></td></tr>"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Membership ID</td>"
            "<td style=\"padding:6px 12px;\"><strong>{{membership_id}}</strong></td></tr>"
            "</table>"
            "<p style=\"font-size:13px;color:#6b7280;\">For your security, please change your password after your first sign-in.</p>"
        ),
        "sample_values": {
            "first_name": "Alex",
            "last_name": "Reyes",
            "email": "alex@example.com",
            "password": "Tr@nsient42!",
            "membership_id": "AUX-105",
            "platform_name": "Legacy",
        },
    },
    {
        "key": "invite_code",
        "name": "Invitation Code",
        "description": "Sent when an existing member creates an invite code for a friend.",
        "variables": {
            "name": "Invitee first name",
            "inviter_name": "Full name of the member sending the invitation",
            "code": "Invite code",
            "register_link": "Pre-filled registration URL with the code",
            "platform_name": "Brand name from CMS Settings",
        },
        "default_subject": "You're invited to join {{platform_name}}",
        "default_body": (
            "<h2 style=\"margin:0 0 16px;\">You're invited!</h2>"
            "<p>Hello {{name}},</p>"
            "<p><strong>{{inviter_name}}</strong> has invited you to join {{platform_name}}.</p>"
            "<p>Your invite code: <strong style=\"font-size:18px;letter-spacing:1px;\">{{code}}</strong></p>"
            "<p style=\"margin:32px 0;\"><a href=\"{{register_link}}\" class=\"btn\">Register now</a></p>"
            "<p style=\"font-size:13px;color:#6b7280;\">Or paste this URL into your browser: {{register_link}}</p>"
        ),
        "sample_values": {
            "name": "Alex",
            "inviter_name": "Carlos Artiles",
            "code": "ABCD-1234",
            "register_link": "https://example.com/my-account/register?code=ABCD-1234",
            "platform_name": "Legacy",
        },
    },
    {
        "key": "contact_form_admin",
        "name": "Contact Form — Admin Notification",
        "description": "Sent to the admin when a visitor submits the public contact form.",
        "variables": {
            "name": "Visitor name",
            "email": "Visitor email",
            "phone": "Visitor phone",
            "subject": "Subject line",
            "message": "Visitor message",
            "platform_name": "Brand name from CMS Settings",
        },
        "default_subject": "New contact form submission: {{subject}}",
        "default_body": (
            "<h2 style=\"margin:0 0 16px;\">New contact form submission</h2>"
            "<table style=\"border-collapse:collapse;\">"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Name</td><td style=\"padding:6px 12px;\">{{name}}</td></tr>"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Email</td><td style=\"padding:6px 12px;\">{{email}}</td></tr>"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Phone</td><td style=\"padding:6px 12px;\">{{phone}}</td></tr>"
            "<tr><td style=\"padding:6px 12px;color:#6b7280;\">Subject</td><td style=\"padding:6px 12px;\">{{subject}}</td></tr>"
            "</table>"
            "<p style=\"margin-top:16px;\"><strong>Message:</strong></p>"
            "<p style=\"white-space:pre-line;\">{{message}}</p>"
        ),
        "sample_values": {
            "name": "Jamie Doe",
            "email": "jamie@example.com",
            "phone": "+1 555 0123",
            "subject": "Question about pricing",
            "message": "Hi! I'd like to know more about your premium plan.",
            "platform_name": "Legacy",
        },
    },
    {
        "key": "smtp_test",
        "name": "SMTP Test Email",
        "description": "Sent from Settings → Email SMTP → Send Test Email so the operator can verify SMTP delivery and preview the live branding.",
        "variables": {
            "recipient_email": "Address the test was sent to",
            "platform_name": "Brand name from CMS Settings",
            "sent_at": "Timestamp the test was triggered (UTC)",
        },
        "default_subject": "{{platform_name}} CMS — SMTP test email",
        "default_body": (
            "<h2 style=\"margin:0 0 16px;\">SMTP test successful</h2>"
            "<p>If you're reading this, your <strong>{{platform_name}}</strong> SMTP "
            "configuration is delivering messages correctly.</p>"
            "<p>This message was sent to <strong>{{recipient_email}}</strong> at "
            "<strong>{{sent_at}}</strong>. The branding, logo, button colour and footer "
            "you see below are exactly what your members will see in their welcome, "
            "password-reset and notification emails.</p>"
            "<p style=\"margin:32px 0;\"><a href=\"#\" class=\"btn\">Sample call-to-action</a></p>"
            "<p style=\"font-size:13px;color:#6b7280;\">You can change this template — or any other "
            "transactional email — from CMS → Settings → Email Management.</p>"
        ),
        "sample_values": {
            "recipient_email": "operator@example.com",
            "platform_name": "Legacy",
            "sent_at": "2026-02-04 14:30 UTC",
        },
    },
]


def get_template_definition(key: str) -> dict | None:
    return next((t for t in EMAIL_TEMPLATES if t["key"] == key), None)


# Default branding wrapper applied around every email body unless the
# operator overrides it from CMS → Email Management → General Design.
DEFAULT_EMAIL_BRANDING = {
    "logo_url": "",
    "primary_color": "#1a2332",
    "button_color": "#c9a84c",
    "button_text_color": "#0d0f14",
    "font_family": "Inter",
    "footer_text": "© {{platform_name}} — All rights reserved.",
    "social_links": [],  # [{platform, url, icon}]
}


# Fonts the operator can pick from. Each entry maps the public label to a
# Google-Fonts-friendly stack used in the rendered email <head>.  The order
# matches the Section → Page Builder → Font selector to stay consistent.
EMAIL_FONT_OPTIONS = [
    {"label": "Inter",          "family": "Inter",          "stack": "'Inter', Arial, sans-serif",                "google": "Inter:wght@400;500;600;700"},
    {"label": "Sora",           "family": "Sora",           "stack": "'Sora', Arial, sans-serif",                 "google": "Sora:wght@400;500;600;700"},
    {"label": "Playfair",       "family": "Playfair",       "stack": "'Playfair Display', Georgia, serif",        "google": "Playfair+Display:wght@400;500;600;700"},
    {"label": "Space Grotesk",  "family": "Space Grotesk",  "stack": "'Space Grotesk', Arial, sans-serif",        "google": "Space+Grotesk:wght@400;500;600;700"},
    {"label": "DM Sans",        "family": "DM Sans",        "stack": "'DM Sans', Arial, sans-serif",              "google": "DM+Sans:wght@400;500;600;700"},
]


def get_font_config(family: str | None) -> dict:
    """Return the font config matching `family` (case-insensitive), defaulting
    to Inter when the value is unknown."""
    name = (family or "").strip()
    for f in EMAIL_FONT_OPTIONS:
        if f["family"].lower() == name.lower():
            return f
    return EMAIL_FONT_OPTIONS[0]
