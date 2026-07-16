#!/usr/bin/env python3
"""
Seed realistic Carlos Artiles personal-brand test data into carlosartiles_cms.
Run on the server: python3 /opt/carlos-artiles-cms/backend/scripts/seed_carlosartiles.py
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "carlosartiles_cms"

now = datetime.now(timezone.utc)


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ─────────────────────────────────────────────────────────────────────
    # 1. SETTINGS
    # ─────────────────────────────────────────────────────────────────────
    await db.settings.update_one({}, {"$set": {
        "site_name":     {"en": "Carlos Artiles", "es": "Carlos Artiles"},
        "tagline":       {"en": "Build. Lead. Inspire.", "es": "Construye. Lidera. Inspira."},
        "contact_email": "hello@carlosartiles.com",
        "contact_phone": "+1 (305) 555-0192",
        "footer_text":   {"en": "© 2026 Carlos Artiles. All rights reserved.",
                          "es": "© 2026 Carlos Artiles. Todos los derechos reservados."},
        "active_theme":  "personalbrand",
        "social_links": [
            {"id": "social-1", "platform": "LinkedIn",  "url": "https://www.linkedin.com/in/carlosartiles",  "icon": "linkedin"},
            {"id": "social-2", "platform": "Instagram", "url": "https://www.instagram.com/carlosartiles",   "icon": "instagram"},
            {"id": "social-3", "platform": "Youtube",   "url": "https://www.youtube.com/@carlosartiles",    "icon": "youtube"},
            {"id": "social-4", "platform": "Twitter",   "url": "https://x.com/carlosartiles",              "icon": "twitter"},
        ],
    }})
    print("✓ settings")

    # ─────────────────────────────────────────────────────────────────────
    # 2. HERO SLIDES
    # ─────────────────────────────────────────────────────────────────────
    await db.hero_slides.delete_many({})
    await db.hero_slides.insert_many([
        {
            "slide_type": "photo",
            "title":    {"en": "<p>Your Story Is<br>Your Greatest Asset</p>",
                         "es": "<p>Tu Historia Es<br>Tu Mayor Activo</p>"},
            "subtitle": {"en": "<p>I help entrepreneurs and executives build a personal brand that opens doors, attracts premium opportunities, and creates lasting impact.</p>",
                         "es": "<p>Ayudo a emprendedores y ejecutivos a construir una marca personal que abre puertas, atrae oportunidades premium y crea impacto duradero.</p>"},
            "cta_text":  {"en": "Start Your Journey",   "es": "Inicia Tu Camino"},
            "cta_url":   "#contact",
            "cta2_text": {"en": "View Services",        "es": "Ver Servicios"},
            "cta2_url":  "#services",
            "visible": True, "order": 0,
            "x": 60, "y": 60, "effect": "fadeIn",
            "text_x": 40, "text_y": 50,
        },
        {
            "slide_type": "photo",
            "title":    {"en": "<p>Turn Expertise<br>Into a Movement</p>",
                         "es": "<p>Convierte Tu Experiencia<br>en un Movimiento</p>"},
            "subtitle": {"en": "<p>15+ years helping leaders amplify their voice, build authority online, and become the go-to name in their industry.</p>",
                         "es": "<p>Más de 15 años ayudando a líderes a amplificar su voz, construir autoridad online y convertirse en la referencia de su industria.</p>"},
            "cta_text": {"en": "Book a Discovery Call", "es": "Agenda una Llamada"},
            "cta_url":  "#contact",
            "visible": True, "order": 1,
            "x": 50, "y": 80, "effect": "slideLeft",
            "text_x": 45, "text_y": 55,
        },
        {
            "slide_type": "photo",
            "title":    {"en": "<p>Success Built on<br>Purpose & Family</p>",
                         "es": "<p>Éxito Construido con<br>Propósito y Familia</p>"},
            "subtitle": {"en": "<p>Building a legacy that goes beyond business — values, relationships, and impact that endure for generations.</p>",
                         "es": "<p>Construyendo un legado que va más allá del negocio — valores, relaciones e impacto que perduran para las generaciones.</p>"},
            "cta_text": {"en": "Learn My Story", "es": "Conoce Mi Historia"},
            "cta_url":  "#about",
            "visible": True, "order": 2,
            "x": 40, "y": 100, "effect": "zoomIn",
            "text_x": 35, "text_y": 45,
        },
    ])
    print("✓ hero_slides (3)")

    # ─────────────────────────────────────────────────────────────────────
    # 3. ABOUT  — clear all, re-seed global + 3 personalities
    # ─────────────────────────────────────────────────────────────────────
    await db.about.delete_many({})
    await db.about.insert_many([
        # Global (used by legacy themes + fallback)
        {
            "title":    {"en": "Carlos Artiles", "es": "Carlos Artiles"},
            "subtitle": {"en": "Personal Brand Strategist & Business Coach",
                         "es": "Estratega de Marca Personal y Coach de Negocios"},
            "description": {"en":
                "<p>For over 15 years I've helped entrepreneurs, executives, and visionaries transform their expertise into a powerful personal brand that generates real business results.</p>"
                "<p>My journey started in finance, where I realised the most successful people weren't just technically skilled — they were masterfully positioned. That insight launched a new mission: help ambitious professionals own their narrative and amplify their impact.</p>"
                "<p>To date I've worked with 500+ clients across 20 industries, helping them land speaking engagements, grow LinkedIn audiences, attract premium clients, and step into positions of true authority.</p>",
                "es":
                "<p>Durante más de 15 años he ayudado a emprendedores, ejecutivos y visionarios a transformar su experiencia en una poderosa marca personal que genera resultados reales.</p>"
                "<p>Mi camino comenzó en las finanzas, donde noté que las personas más exitosas no solo tenían habilidades técnicas — estaban magistralmente posicionadas. Esa percepción lanzó mi misión: ayudar a los profesionales ambiciosos a ser dueños de su narrativa y amplificar su impacto.</p>"},
            "image_url": "",
            "stats": [
                {"label": {"en": "Clients Transformed", "es": "Clientes Transformados"}, "value": "500+"},
                {"label": {"en": "Years of Experience",  "es": "Años de Experiencia"},   "value": "15+"},
                {"label": {"en": "Industries Served",    "es": "Industrias Atendidas"},  "value": "20"},
                {"label": {"en": "Speaking Engagements", "es": "Conferencias"},           "value": "200+"},
            ],
            "order": 0, "visible": True,
        },
        # Business personality
        {
            "pb_personality": "business",
            "title":    {"en": "Carlos Artiles", "es": "Carlos Artiles"},
            "subtitle": {"en": "Personal Brand Strategist & Business Coach",
                         "es": "Estratega de Marca Personal y Coach de Negocios"},
            "description": {"en":
                "<p>I'm Carlos Artiles — strategist, speaker, and creator of the Brand Authority Framework used by 500+ executives and entrepreneurs worldwide.</p>"
                "<p>I built this methodology after watching talented professionals get passed over for the opportunities they deserved because the world simply didn't know their name. My work is to change that — with strategy, consistency, and a story only you can tell.</p>"
                "<p>When we work together, you don't just get a new LinkedIn profile. You get a complete identity system, a content engine, and a roadmap to becoming the most recognised voice in your field.</p>",
                "es":
                "<p>Soy Carlos Artiles — estratega, conferencista y creador del Marco de Autoridad de Marca utilizado por más de 500 ejecutivos y emprendedores en todo el mundo.</p>"
                "<p>Construí esta metodología después de ver a profesionales talentosos ser ignorados por las oportunidades que merecían porque el mundo simplemente no conocía su nombre.</p>"},
            "image_url": "",
            "stats": [
                {"label": {"en": "Clients Transformed", "es": "Clientes Transformados"}, "value": "500+"},
                {"label": {"en": "Years of Experience",  "es": "Años de Experiencia"},   "value": "15+"},
                {"label": {"en": "Industries Served",    "es": "Industrias Atendidas"},  "value": "20"},
                {"label": {"en": "Speaking Engagements", "es": "Conferencias"},           "value": "200+"},
            ],
            "order": 0, "visible": True,
        },
        # Lifestyle personality
        {
            "pb_personality": "lifestyle",
            "title":    {"en": "Life by Design", "es": "Vida por Diseño"},
            "subtitle": {"en": "Living intentionally across business, wellness & adventure",
                         "es": "Viviendo con intención en negocios, bienestar y aventura"},
            "description": {"en":
                "<p>Beyond the boardroom I'm a passionate traveller, fitness enthusiast, and lifelong learner. I believe a fulfilling life is the foundation of a powerful brand — you can't project abundance if you're running on empty.</p>"
                "<p>Every year I commit to 3 new adventures, 3 new skills, and 3 meaningful new relationships. It's a framework I share with clients because the best personal brands are built on authentic, full lives.</p>",
                "es":
                "<p>Más allá de la sala de juntas, soy un viajero apasionado, entusiasta del fitness y aprendiz de por vida. Creo que una vida plena es el fundamento de una marca poderosa.</p>"
                "<p>Cada año me comprometo con 3 nuevas aventuras, 3 nuevas habilidades y 3 relaciones significativas nuevas. Es un marco que comparto con mis clientes porque las mejores marcas personales se construyen sobre vidas auténticas y plenas.</p>"},
            "image_url": "",
            "order": 0, "visible": True,
        },
        # Personal personality
        {
            "pb_personality": "personal",
            "title":    {"en": "Family First", "es": "Familia Primero"},
            "subtitle": {"en": "The people who inspire everything I do",
                         "es": "Las personas que inspiran todo lo que hago"},
            "description": {"en":
                "<p>Behind every achievement is a family that believed in me before I believed in myself. My wife, my children, and the extended family network that built resilience, gratitude, and purpose into my foundation.</p>"
                "<p>I share this because I believe the most powerful personal brands aren't built in isolation — they're built from love, from roots, and from a desire to leave something meaningful behind.</p>"
                "<p>I've mentored emerging entrepreneurs through the ACapital network, invested in early-stage companies, and collaborated with community builders across Latin America and the US to create ecosystems where talent thrives. Relationships are the ROI that never depreciates.</p>",
                "es":
                "<p>Detrás de cada logro hay una familia que creyó en mí antes de que yo creyera en mí mismo. Mi esposa, mis hijos y la red familiar extendida que construyó resiliencia, gratitud y propósito en mi base.</p>"
                "<p>Las relaciones son el ROI que nunca se deprecia.</p>"},
            "image_url": "",
            "order": 0, "visible": True,
        },
    ])
    print("✓ about (4 docs: global + 3 personalities)")

    # ─────────────────────────────────────────────────────────────────────
    # 4. SERVICES
    # ─────────────────────────────────────────────────────────────────────
    await db.services.delete_many({})
    await db.services.insert_many([
        {
            "title":       {"en": "Brand Discovery Session",       "es": "Sesión de Descubrimiento de Marca"},
            "description": {"en": "<p>A focused 2-hour 1:1 strategy session where we excavate your unique story, map your competitive positioning, and define the brand narrative that sets you apart. You leave with a clear Brand Identity Canvas and your top 3 content pillars.</p>",
                            "es": "<p>Una sesión estratégica de 2 horas donde excavamos tu historia única, mapeamos tu posicionamiento competitivo y definimos la narrativa de marca que te distingue. Sales con un Canvas de Identidad de Marca y tus 3 pilares de contenido principales.</p>"},
            "price":    {"en": "$500",  "es": "$500"},
            "features": {"en": "2-hr 1:1 video call · Brand Identity Canvas · 3 content pillars · 30-day action plan",
                         "es": "Videollamada 1:1 de 2h · Canvas de Identidad de Marca · 3 pilares de contenido · Plan de acción 30 días"},
            "cta_url": "#contact", "cta_text": {"en": "Book Now", "es": "Reservar Ahora"},
            "order": 0, "visible": True, "icon": "Compass",
        },
        {
            "title":       {"en": "Personal Brand Accelerator",    "es": "Acelerador de Marca Personal"},
            "description": {"en": "<p>A 12-week intensive coaching program to build your complete personal brand ecosystem from the ground up — identity, content strategy, LinkedIn optimisation, media presence, and audience growth. Includes weekly 1:1 calls and hands-on implementation support.</p>",
                            "es": "<p>Un programa intensivo de coaching de 12 semanas para construir tu ecosistema completo de marca personal desde cero — identidad, estrategia de contenido, optimización de LinkedIn, presencia en medios y crecimiento de audiencia.</p>"},
            "price":    {"en": "$3,997", "es": "$3,997"},
            "features": {"en": "12 weekly 1:1 calls · Full brand kit · LinkedIn makeover · 90-day content calendar · Media pitch templates · 90 days of ongoing support",
                         "es": "12 llamadas semanales 1:1 · Kit de marca completo · Renovación de LinkedIn · Calendario de contenido 90 días · Plantillas de propuesta para medios · 90 días de soporte continuo"},
            "cta_url": "#contact", "cta_text": {"en": "Apply Now", "es": "Aplicar Ahora"},
            "order": 1, "visible": True, "icon": "Rocket", "featured": True,
        },
        {
            "title":       {"en": "LinkedIn Authority Blueprint",  "es": "Blueprint de Autoridad en LinkedIn"},
            "description": {"en": "<p>A complete LinkedIn transformation: profile audit and rewrite, content strategy, posting cadence, and engagement system built specifically for your industry and goals. Designed to position you as the #1 name your ideal clients think of.</p>",
                            "es": "<p>Una transformación completa de LinkedIn: auditoría y reescritura del perfil, estrategia de contenido, cadencia de publicaciones y sistema de engagement construido específicamente para tu industria y objetivos.</p>"},
            "price":    {"en": "$1,200", "es": "$1,200"},
            "features": {"en": "Profile audit & rewrite · 90-day content calendar · Hashtag strategy · Engagement templates · DM script library",
                         "es": "Auditoría y reescritura del perfil · Calendario de contenido 90 días · Estrategia de hashtags · Plantillas de engagement · Biblioteca de scripts de DM"},
            "cta_url": "#contact", "cta_text": {"en": "Get Started", "es": "Comenzar"},
            "order": 2, "visible": True, "icon": "Linkedin",
        },
        {
            "title":       {"en": "Executive Presence Coaching",   "es": "Coaching de Presencia Ejecutiva"},
            "description": {"en": "<p>For senior leaders and C-suite executives who want to command the room, lead their industry narrative, and build a personal brand that amplifies organisational credibility. A 6-month VIP engagement with full white-glove support.</p>",
                            "es": "<p>Para líderes senior y ejecutivos de nivel C que quieren dominar la sala, liderar la narrativa de su industria y construir una marca personal que amplifica la credibilidad organizacional. Un compromiso VIP de 6 meses con soporte completo.</p>"},
            "price":    {"en": "$8,500", "es": "$8,500"},
            "features": {"en": "6-month program · Weekly 1:1 calls · Board presentation coaching · Media training · Speaking bureau introduction · Personal PR support",
                         "es": "Programa de 6 meses · Llamadas semanales 1:1 · Coaching de presentaciones · Entrenamiento en medios · Introducción a bureau de oradores · Soporte de PR personal"},
            "cta_url": "#contact", "cta_text": {"en": "Inquire Now", "es": "Consultar Ahora"},
            "order": 3, "visible": True, "icon": "Star",
        },
        {
            "title":       {"en": "Group Mastermind",              "es": "Mastermind Grupal"},
            "description": {"en": "<p>Monthly live sessions with a curated group of 12 professionals committed to building brand authority. Includes peer feedback, accountability, guest expert sessions, and direct coaching from Carlos in a powerful community format.</p>",
                            "es": "<p>Sesiones en vivo mensuales con un grupo selecto de 12 profesionales comprometidos con construir su autoridad de marca. Incluye feedback de pares, responsabilidad, sesiones de expertos invitados y coaching directo de Carlos.</p>"},
            "price":    {"en": "$297/mo", "es": "$297/mes"},
            "features": {"en": "2 monthly live calls · Private community · Monthly hot seat · Guest expert sessions · Resource library",
                         "es": "2 llamadas en vivo mensuales · Comunidad privada · Hot seat mensual · Sesiones de expertos · Biblioteca de recursos"},
            "cta_url": "#contact", "cta_text": {"en": "Join the Group", "es": "Unirme al Grupo"},
            "order": 4, "visible": True, "icon": "Users",
        },
    ])
    print("✓ services (5)")

    # ─────────────────────────────────────────────────────────────────────
    # 5. TESTIMONIALS
    # ─────────────────────────────────────────────────────────────────────
    await db.testimonials.delete_many({})
    await db.testimonials.insert_many([
        {
            "name":    {"en": "Marco Vidal",    "es": "Marco Vidal"},
            "role":    {"en": "CEO, Nexus Capital Partners",              "es": "CEO, Nexus Capital Partners"},
            "content": {"en": "<p>Working with Carlos completely transformed how I present myself online. Within 3 months of implementing his Accelerator programme, my LinkedIn engagement went up 10× and I closed two enterprise deals that came inbound for the first time ever.</p>",
                        "es": "<p>Trabajar con Carlos transformó completamente cómo me presento online. En 3 meses de implementar su programa Acelerador, mi engagement en LinkedIn subió 10× y cerré dos contratos empresariales que llegaron de forma inbound por primera vez.</p>"},
            "image_url": "", "rating": 5, "visible": True, "order": 0,
        },
        {
            "name":    {"en": "Isabella Reyes", "es": "Isabella Reyes"},
            "role":    {"en": "Chief Marketing Officer, Meridian Consulting",  "es": "Directora de Marketing, Meridian Consulting"},
            "content": {"en": "<p>Carlos has a rare ability to extract your authentic story and turn it into a magnetic brand narrative. I went from feeling invisible in my industry to being invited to speak at three major conferences — all within six months.</p>",
                        "es": "<p>Carlos tiene una rara habilidad para extraer tu historia auténtica y convertirla en una narrativa de marca magnética. Pasé de sentirme invisible a ser invitada a hablar en tres conferencias importantes en seis meses.</p>"},
            "image_url": "", "rating": 5, "visible": True, "order": 1,
        },
        {
            "name":    {"en": "David Morales",  "es": "David Morales"},
            "role":    {"en": "Founder, Apex Digital Studio",              "es": "Fundador, Apex Digital Studio"},
            "content": {"en": "<p>The ROI on Carlos's coaching is undeniable. Within 60 days of the LinkedIn Blueprint I had three speaking engagements booked and was featured in two industry publications. Carlos doesn't just coach — he builds alongside you.</p>",
                        "es": "<p>El ROI del coaching de Carlos es innegable. En 60 días tenía tres conferencias reservadas y había aparecido en dos publicaciones del sector. Carlos no solo entrena — construye contigo.</p>"},
            "image_url": "", "rating": 5, "visible": True, "order": 2,
        },
        {
            "name":    {"en": "Sofía Castro",   "es": "Sofía Castro"},
            "role":    {"en": "Executive Director, Luminary Ventures",     "es": "Directora Ejecutiva, Luminary Ventures"},
            "content": {"en": "<p>I was sceptical that personal branding could move the needle for a traditional finance executive. Carlos proved me wrong. Six months in, I had a waiting list of clients for the first time in my career. The investment paid for itself 20× over.</p>",
                        "es": "<p>Era escéptica de que la marca personal pudiera marcar la diferencia para una ejecutiva de finanzas tradicional. Carlos me demostró que estaba equivocada. A los seis meses tenía lista de espera de clientes por primera vez en mi carrera.</p>"},
            "image_url": "", "rating": 5, "visible": True, "order": 3,
        },
        {
            "name":    {"en": "Juan Luis Peña", "es": "Juan Luis Peña"},
            "role":    {"en": "Serial Entrepreneur & Investor",             "es": "Emprendedor Serial e Inversor"},
            "content": {"en": "<p>Carlos helped me position 20 years of entrepreneurial experience into a consultant brand that now generates daily inbound leads. His Group Mastermind alone is worth 10× the investment — the quality of the network and the accountability is extraordinary.</p>",
                        "es": "<p>Carlos me ayudó a posicionar 20 años de experiencia empresarial en una marca de consultor que ahora genera contactos inbound a diario. El Mastermind Grupal por sí solo vale 10× la inversión.</p>"},
            "image_url": "", "rating": 5, "visible": True, "order": 4,
        },
    ])
    print("✓ testimonials (5)")

    # ─────────────────────────────────────────────────────────────────────
    # 6. PORTFOLIO
    # ─────────────────────────────────────────────────────────────────────
    await db.portfolios.delete_many({})
    await db.portfolios.insert_many([
        {
            "title":       {"en": "From 0 to 50K LinkedIn Followers in 12 Months",
                            "es": "De 0 a 50K Seguidores en LinkedIn en 12 Meses"},
            "description": {"en": "<p>A fintech founder with zero online presence transformed into a LinkedIn thought leader. Built a daily posting system, engagement strategy, and authority content that drove 50,000 followers, 3 podcast invitations, and a 40% increase in inbound sales calls.</p>",
                            "es": "<p>Un fundador de fintech sin presencia online se convirtió en líder de pensamiento en LinkedIn con 50,000 seguidores y un aumento del 40% en ventas inbound.</p>"},
            "category": {"en": "LinkedIn Growth",     "es": "Crecimiento en LinkedIn"},
            "client":   {"en": "Fintech Startup Founder", "es": "Fundador de Startup Fintech"},
            "year": "2025", "image_url": "", "visible": True, "order": 0,
            "results": {"en": "50K followers · 3 podcast appearances · +40% inbound calls",
                        "es": "50K seguidores · 3 apariciones en podcasts · +40% llamadas inbound"},
        },
        {
            "title":       {"en": "Corporate Executive to Industry Authority",
                            "es": "Ejecutivo Corporativo a Autoridad de la Industria"},
            "description": {"en": "<p>A 25-year CFO veteran transitioning to advisory. Built a complete personal brand identity and a weekly newsletter now at 8,000 subscribers, positioning her as the go-to advisor for mid-market M&A strategy.</p>",
                            "es": "<p>Una CFO veterana de 25 años en transición a asesoría construyó una marca completa y un newsletter con 8,000 suscriptores, posicionándola como la asesora de referencia para M&A en el mercado medio.</p>"},
            "category": {"en": "Brand Repositioning",        "es": "Reposicionamiento de Marca"},
            "client":   {"en": "CFO turned M&A Advisor",     "es": "CFO convertida en Asesora M&A"},
            "year": "2025", "image_url": "", "visible": True, "order": 1,
            "results": {"en": "8K newsletter subscribers · 12 advisory clients · Forbes feature",
                        "es": "8K suscriptores · 12 clientes asesores · Mención en Forbes"},
        },
        {
            "title":       {"en": "25 Keynote Engagements in 18 Months",
                            "es": "25 Conferencias en 18 Meses"},
            "description": {"en": "<p>A business coach with great content but zero speaking credentials. Developed a speaker positioning strategy, crafted a compelling speaker kit, and built relationships with 15 event organisers — resulting in a full speaking calendar generating $180K in annual stage revenue.</p>",
                            "es": "<p>Un coach de negocios con excelente contenido pero sin credenciales de orador logró un calendario completo de conferencias generando $180K anuales.</p>"},
            "category": {"en": "Speaking Authority",  "es": "Autoridad como Orador"},
            "client":   {"en": "Business Coach",       "es": "Coach de Negocios"},
            "year": "2024", "image_url": "", "visible": True, "order": 2,
            "results": {"en": "25 keynotes · $180K speaking revenue · 5-star rated",
                        "es": "25 conferencias · $180K en ingresos · 5 estrellas"},
        },
        {
            "title":       {"en": "Podcast Launch: 100K Downloads in Year One",
                            "es": "Lanzamiento de Podcast: 100K Descargas en el Primer Año"},
            "description": {"en": "<p>Helped a serial entrepreneur launch 'The Authority Builder' podcast from concept to 100,000 downloads in year one. Developed the positioning, guest booking strategy, and promotional system — resulting in a book deal and two new corporate training contracts.</p>",
                            "es": "<p>Ayudé a un emprendedor serial a lanzar el podcast 'The Authority Builder' de concepto a 100,000 descargas en el primer año, consiguiendo un contrato de libro y dos contratos corporativos.</p>"},
            "category": {"en": "Podcast & Media",     "es": "Podcast y Medios"},
            "client":   {"en": "Serial Entrepreneur", "es": "Emprendedor Serial"},
            "year": "2024", "image_url": "", "visible": True, "order": 3,
            "results": {"en": "100K downloads yr 1 · Book deal · 2 corporate contracts",
                        "es": "100K descargas · Contrato de libro · 2 contratos corporativos"},
        },
        {
            "title":       {"en": "Miami's #1 LinkedIn Voice in Real Estate",
                            "es": "La Voz #1 de LinkedIn en Bienes Raíces de Miami"},
            "description": {"en": "<p>Repositioned a Miami real estate team leader around luxury-market expertise and community leadership. Now recognised as the #1 LinkedIn voice in Miami real estate with 35K followers and $4M in referral-sourced business annually.</p>",
                            "es": "<p>Reposicioné a una líder de equipo inmobiliario de Miami como la voz #1 de LinkedIn en bienes raíces de Miami con 35K seguidores y $4M en negocio por referidos anuales.</p>"},
            "category": {"en": "Real Estate Brand",       "es": "Marca Inmobiliaria"},
            "client":   {"en": "Real Estate Team Leader", "es": "Líder de Equipo Inmobiliario"},
            "year": "2025", "image_url": "", "visible": True, "order": 4,
            "results": {"en": "35K followers · #1 LinkedIn voice Miami RE · $4M referrals/yr",
                        "es": "35K seguidores · Voz #1 LinkedIn bienes raíces Miami · $4M/año"},
        },
    ])
    print("✓ portfolio (5 case studies)")

    # ─────────────────────────────────────────────────────────────────────
    # 7. BOOKS (reading list)
    # ─────────────────────────────────────────────────────────────────────
    await db.books.delete_many({})
    await db.books.insert_many([
        {"title": {"en": "Building a StoryBrand"},            "author": "Donald Miller",
         "description": {"en": "The definitive guide to clarifying your message so customers listen. Transformed how I approach brand narrative for every client.", "es": "La guía definitiva para clarificar tu mensaje."},
         "category": {"en": "Branding", "es": "Marca Personal"}, "image_url": "", "visible": True, "order": 0},
        {"title": {"en": "They Ask, You Answer"},             "author": "Marcus Sheridan",
         "description": {"en": "A radical approach to inbound sales and content marketing. The framework I use to help clients become the most trusted voice in their industry.", "es": "Un enfoque radical para ventas inbound y marketing de contenidos."},
         "category": {"en": "Content Strategy", "es": "Estrategia de Contenido"}, "image_url": "", "visible": True, "order": 1},
        {"title": {"en": "The Presentation Secrets of Steve Jobs"}, "author": "Carmine Gallo",
         "description": {"en": "How to be insanely great in front of any audience. Essential reading for anyone building a speaking or thought leadership practice.", "es": "Cómo ser extraordinario frente a cualquier audiencia."},
         "category": {"en": "Communication", "es": "Comunicación"}, "image_url": "", "visible": True, "order": 2},
        {"title": {"en": "Good to Great"},                   "author": "Jim Collins",
         "description": {"en": "Why some companies make the leap and others don't. The research-backed frameworks here apply directly to personal brand positioning.", "es": "Por qué algunas empresas dan el salto y otras no."},
         "category": {"en": "Leadership", "es": "Liderazgo"}, "image_url": "", "visible": True, "order": 3},
        {"title": {"en": "Atomic Habits"},                   "author": "James Clear",
         "description": {"en": "The system for building sustainable content creation habits. I recommend this to every client on day one.", "es": "El sistema para construir hábitos sostenibles de creación de contenido."},
         "category": {"en": "Productivity", "es": "Productividad"}, "image_url": "", "visible": True, "order": 4},
        {"title": {"en": "Expert Secrets"},                  "author": "Russell Brunson",
         "description": {"en": "The playbook for converting your online visitors into lifelong customers. Fundamental for monetising personal brand authority.", "es": "El manual para convertir visitantes en clientes de por vida."},
         "category": {"en": "Marketing", "es": "Marketing"}, "image_url": "", "visible": True, "order": 5},
    ])
    print("✓ books (6)")

    # ─────────────────────────────────────────────────────────────────────
    # 8. BLOG POSTS
    # ─────────────────────────────────────────────────────────────────────
    await db.blog_posts.delete_many({})
    await db.blog_posts.insert_many([
        {
            "title":   {"en": "5 Signs Your Personal Brand Is Working Against You",
                        "es": "5 Señales de que Tu Marca Personal Está Trabajando en Tu Contra"},
            "slug":    "5-signs-personal-brand-working-against-you",
            "excerpt": {"en": "Most professionals have a personal brand — they just don't know it. The question is whether yours is attracting the right opportunities or silently pushing them away.",
                        "es": "La mayoría de los profesionales tienen una marca personal — solo que no lo saben. La pregunta es si la tuya atrae las oportunidades correctas o las aleja silenciosamente."},
            "content": {"en":
                "<p>Most professionals have a personal brand — they just don't know it. The question is whether yours is attracting the right opportunities or silently pushing them away.</p>"
                "<h2>1. You're the best-kept secret in your industry</h2>"
                "<p>If people who meet you in person are consistently surprised by how accomplished you are, your brand isn't doing its job. Your reputation should precede you.</p>"
                "<h2>2. Your LinkedIn profile reads like a résumé, not a story</h2>"
                "<p>Résumés list what you've done. Personal brands communicate why you exist and who you serve. If your headline is still 'Title at Company,' you're leaving real money on the table.</p>"
                "<h2>3. You're being passed over for opportunities you're qualified for</h2>"
                "<p>Visibility creates opportunity. The person who gets the speaking invitation, the board seat, or the advisory role is often the one who showed up consistently online — not the most qualified person.</p>"
                "<h2>4. You feel like you're starting from zero every time</h2>"
                "<p>A strong brand creates compounding returns. Every piece of content, every conversation, every article should be building equity. If you're constantly re-introducing yourself, you haven't built a brand — you've built a persona that resets.</p>"
                "<h2>5. Your digital footprint doesn't match your real-world reputation</h2>"
                "<p>Google yourself right now. What comes up? If the answer doesn't match what your best clients and colleagues would say about you, you have a brand gap that's costing you daily.</p>",
                "es":
                "<p>La mayoría de los profesionales tienen una marca personal — solo que no lo saben. La pregunta es si la tuya atrae las oportunidades correctas o las aleja silenciosamente.</p>"
                "<h2>1. Eres el secreto mejor guardado de tu industria</h2>"
                "<p>Si las personas que te conocen en persona quedan sorprendidas por tus logros, tu marca no está haciendo su trabajo. Tu reputación debe precederte.</p>"},
            "category": {"en": "Personal Branding", "es": "Marca Personal"},
            "author": "Carlos Artiles",
            "image_url": "",
            "published_at": (now - timedelta(days=7)).isoformat(),
            "visible": True, "featured": True,
        },
        {
            "title":   {"en": "How to Build LinkedIn Authority Without Feeling Fake",
                        "es": "Cómo Construir Autoridad en LinkedIn Sin Sentirte Falso"},
            "slug":    "build-linkedin-authority-authentic",
            "excerpt": {"en": "The biggest mistake executives make on LinkedIn is trying to sound like someone they're not. Here's how to build real authority by leaning into what makes you distinct.",
                        "es": "El mayor error de los ejecutivos en LinkedIn es intentar sonar como alguien que no son. Así construyes autoridad real siendo auténtico."},
            "content": {"en":
                "<p>The biggest mistake executives make on LinkedIn is trying to sound like someone they're not. People don't follow companies — they follow humans, and the most powerful content is almost always personal.</p>"
                "<h2>Start with your 'Why I care' story</h2>"
                "<p>Every niche has a hundred experts. What makes you different isn't your credentials — it's the moment that made this work meaningful to you. Share that story.</p>"
                "<h2>Post consistently over posting perfectly</h2>"
                "<p>Three imperfect posts a week will outperform one flawless post per month every single time. Algorithms reward consistency. Audiences reward presence.</p>"
                "<h2>Take a position, not just a stance</h2>"
                "<p>The fastest way to build authority is to say something that not everyone agrees with. Not controversial for the sake of it — but clear, grounded, honest perspectives on things that matter in your field.</p>",
                "es":
                "<p>El mayor error que cometen los ejecutivos en LinkedIn es intentar sonar como alguien que no son. La verdad es que la gente no sigue empresas, sigue personas.</p>"},
            "category": {"en": "LinkedIn Strategy", "es": "Estrategia de LinkedIn"},
            "author": "Carlos Artiles",
            "image_url": "",
            "published_at": (now - timedelta(days=14)).isoformat(),
            "visible": True, "featured": False,
        },
        {
            "title":   {"en": "The Executive's Guide to Becoming the Face of Your Industry",
                        "es": "La Guía del Ejecutivo para Convertirse en el Rostro de Su Industria"},
            "slug":    "executive-guide-become-industry-face",
            "excerpt": {"en": "Industry authorities aren't born — they're built. Here's the 90-day framework I use with senior leaders to transform them from well-respected insiders into widely recognised authorities.",
                        "es": "Las autoridades de la industria no nacen — se construyen. Aquí está el marco de 90 días que uso con líderes senior."},
            "content": {"en":
                "<p>Industry authorities aren't born — they're built. And the process is more systematic than most executives realise.</p>"
                "<h2>The 3 Pillars of Industry Authority</h2>"
                "<p><strong>1. Intellectual Property (IP)</strong> — You need a framework, a methodology, or a model that is distinctly yours. Without unique IP, you're just a voice in the crowd.</p>"
                "<p><strong>2. Distribution</strong> — Even brilliant IP dies without distribution. You need at least one primary channel (LinkedIn for B2B) and a secondary (podcast, newsletter, speaking stage).</p>"
                "<p><strong>3. Proof</strong> — Case studies, data, testimonials, and outcomes. Authority requires evidence.</p>"
                "<h2>The 90-Day Authority Sprint</h2>"
                "<p><strong>Days 1–30:</strong> Define your IP. What framework do you use to solve problems? Document it. Name it. Own it.</p>"
                "<p><strong>Days 31–60:</strong> Build your content machine. Create 90 posts from your IP framework. Post 3×/week on LinkedIn.</p>"
                "<p><strong>Days 61–90:</strong> Amplify. Pitch two podcasts, submit one conference speaking proposal, pitch one industry publication.</p>",
                "es":
                "<p>Las autoridades de la industria no nacen — se construyen. Y el proceso es más sistemático de lo que la mayoría de los ejecutivos imagina.</p>"},
            "category": {"en": "Thought Leadership", "es": "Liderazgo de Opinión"},
            "author": "Carlos Artiles",
            "image_url": "",
            "published_at": (now - timedelta(days=21)).isoformat(),
            "visible": True, "featured": False,
        },
    ])
    print("✓ blog_posts (3)")

    # ─────────────────────────────────────────────────────────────────────
    # 9. GALLERY
    # ─────────────────────────────────────────────────────────────────────
    await db.gallery.delete_many({})
    await db.gallery.insert_many([
        {"title": {"en": "Miami Brand Summit 2025",         "es": "Cumbre de Marca Miami 2025"},
         "description": {"en": "Speaking to 400+ entrepreneurs at the annual Brand Summit",
                         "es": "Hablando a más de 400 emprendedores en la Cumbre Anual de Marca"},
         "category": {"en": "Speaking", "es": "Conferencias"}, "image_url": "", "visible": True, "order": 0},
        {"title": {"en": "LinkedIn Authority Workshop — NYC",  "es": "Taller de Autoridad en LinkedIn — NYC"},
         "description": {"en": "3-day intensive workshop with 40 executives in New York",
                         "es": "Taller intensivo de 3 días con 40 ejecutivos en Nueva York"},
         "category": {"en": "Workshop", "es": "Taller"}, "image_url": "", "visible": True, "order": 1},
        {"title": {"en": "Forbes Entrepreneurship Panel",    "es": "Panel de Emprendimiento Forbes"},
         "description": {"en": "Moderating the entrepreneurship panel at the Forbes Innovators Summit",
                         "es": "Moderando el panel de emprendimiento en el Forbes Innovators Summit"},
         "category": {"en": "Media", "es": "Medios"}, "image_url": "", "visible": True, "order": 2},
        {"title": {"en": "Patagonia Expedition 2025",         "es": "Expedición Patagonia 2025"},
         "description": {"en": "10 days in Torres del Paine — a reminder that adventure fuels creativity",
                         "es": "10 días en Torres del Paine — un recordatorio de que la aventura alimenta la creatividad"},
         "category": {"en": "Travel", "es": "Viajes"}, "image_url": "", "visible": True, "order": 3},
        {"title": {"en": "Family Celebration — Miami Beach",  "es": "Celebración Familiar — Miami Beach"},
         "description": {"en": "The people who make everything worth it",
                         "es": "Las personas que hacen que todo valga la pena"},
         "category": {"en": "Family", "es": "Familia"}, "image_url": "", "visible": True, "order": 4},
        {"title": {"en": "Mastermind Retreat — Tulum",        "es": "Retiro Mastermind — Tulum"},
         "description": {"en": "Annual retreat with top-tier mastermind clients — strategy, connection, growth",
                         "es": "Retiro anual con clientes mastermind de alto nivel — estrategia, conexión, crecimiento"},
         "category": {"en": "Events", "es": "Eventos"}, "image_url": "", "visible": True, "order": 5},
    ])
    print("✓ gallery (6)")

    # ─────────────────────────────────────────────────────────────────────
    # 10. AUREX SECTION CONFIGS  (global — no pb_personality)
    # ─────────────────────────────────────────────────────────────────────
    config_updates = {
        "aurex_audience": {
            "eyebrow":  {"en": "Who I Work With",    "es": "Con Quién Trabajo"},
            "title":    {"en": "This Is Built for You",
                         "es": "Esto Está Construido Para Ti"},
            "subtitle": {"en": "I work best with ambitious professionals ready to invest in their visibility and reputation.",
                         "es": "Trabajo mejor con profesionales ambiciosos listos para invertir en su visibilidad y reputación."},
        },
        "aurex_process": {
            "eyebrow":  {"en": "How We Work",             "es": "Cómo Trabajamos"},
            "title":    {"en": "The Brand Authority Framework",
                         "es": "El Marco de Autoridad de Marca"},
            "subtitle": {"en": "A proven 4-step process to take you from unknown to undeniable in your industry.",
                         "es": "Un proceso probado de 4 pasos para llevarte de desconocido a indiscutible en tu industria."},
        },
        "aurex_pricing": {
            "eyebrow":  {"en": "Investment",          "es": "Inversión"},
            "title":    {"en": "Programmes Built Around Your Goals",
                         "es": "Programas Construidos Alrededor de Tus Metas"},
            "subtitle": {"en": "Transparent, results-focused pricing. Every programme is a direct investment in your future authority and income.",
                         "es": "Precios transparentes y orientados a resultados. Cada programa es una inversión directa en tu autoridad e ingresos futuros."},
        },
        "aurex_team": {
            "eyebrow":  {"en": "The Team",            "es": "El Equipo"},
            "title":    {"en": "World-Class Support, Every Step",
                         "es": "Apoyo de Clase Mundial en Cada Paso"},
            "subtitle": {"en": "You don't just get Carlos — you get a full team of branding, content, and strategy specialists.",
                         "es": "No solo obtienes a Carlos — obtienes un equipo completo de especialistas en marca, contenido y estrategia."},
        },
        "aurex_events": {
            "eyebrow":  {"en": "Upcoming Events",     "es": "Próximos Eventos"},
            "title":    {"en": "Join Me Live",
                         "es": "Únete a Mí en Vivo"},
            "subtitle": {"en": "Masterclasses, workshops, and retreats designed to accelerate your brand authority in days, not months.",
                         "es": "Masterclasses, talleres y retiros diseñados para acelerar tu autoridad de marca en días, no meses."},
        },
        "aurex_partners": {
            "eyebrow":  {"en": "Partners",            "es": "Socios"},
            "title":    {"en": "The Network Behind the Results",
                         "es": "La Red Detrás de los Resultados"},
            "subtitle": {"en": "Strategic partnerships with leading media, investment, and business growth organisations.",
                         "es": "Alianzas estratégicas con organizaciones líderes de medios, inversión y crecimiento empresarial."},
        },
        "aurex_clients": {
            "eyebrow":  {"en": "Trusted By",          "es": "Confiado por"},
            "title":    {"en": "Companies Where Leaders Grow",
                         "es": "Empresas Donde Crecen los Líderes"},
            "subtitle": {"en": "From startups to Fortune 500 executives — personal brand drives results at every level.",
                         "es": "Desde startups hasta ejecutivos de Fortune 500 — la marca personal impulsa resultados en todos los niveles."},
        },
        "aurex_video": {
            "eyebrow":  {"en": "In Action",           "es": "En Acción"},
            "title":    {"en": "See the Transformation",
                         "es": "Mira la Transformación"},
            "subtitle": {"en": "A behind-the-scenes look at how we build brands that change careers and businesses.",
                         "es": "Una mirada detrás de escena de cómo construimos marcas que cambian carreras y negocios."},
            "youtube_url": "https://www.youtube.com/watch?v=qp0HIF3SfI4",
        },
        "aurex_testimonials_cfg": {
            "eyebrow":  {"en": "Client Stories",      "es": "Historias de Clientes"},
            "title":    {"en": "Real Results, Real People",
                         "es": "Resultados Reales, Personas Reales"},
            "subtitle": {"en": "Every testimonial represents a business transformed, a career elevated, and a life changed.",
                         "es": "Cada testimonio representa un negocio transformado, una carrera elevada y una vida cambiada."},
        },
        "aurex_services_cfg": {
            "eyebrow":  {"en": "Services",            "es": "Servicios"},
            "title":    {"en": "Invest in Your Authority",
                         "es": "Invierte en Tu Autoridad"},
            "subtitle": {"en": "Each service is designed to deliver measurable results — more visibility, more credibility, more revenue.",
                         "es": "Cada servicio está diseñado para entregar resultados medibles — más visibilidad, más credibilidad, más ingresos."},
        },
        "aurex_news_cfg": {
            "eyebrow":  {"en": "In the Press",        "es": "En la Prensa"},
            "title":    {"en": "Latest News & Media Features",
                         "es": "Últimas Noticias y Apariciones en Medios"},
            "subtitle": {"en": "Stay current with the ideas and conversations shaping the future of personal branding.",
                         "es": "Mantente al día con las ideas y conversaciones que dan forma al futuro de la marca personal."},
            "cta_text": {"en": "See All News",        "es": "Ver Todas las Noticias"},
        },
        "aurex_blog_cfg": {
            "eyebrow":  {"en": "Insights",            "es": "Ideas"},
            "title":    {"en": "The Brand Authority Blog",
                         "es": "El Blog de Autoridad de Marca"},
            "subtitle": {"en": "Actionable strategies, case studies, and frameworks to help you build a brand that commands attention and creates opportunity.",
                         "es": "Estrategias accionables, estudios de caso y marcos para construir una marca que genere atención y oportunidades."},
            "cta_text": {"en": "Read All Articles",   "es": "Leer Todos los Artículos"},
        },
        "aurex_reading_cfg": {
            "eyebrow":  {"en": "Reading List",        "es": "Lista de Lectura"},
            "title":    {"en": "Books That Shaped My Thinking",
                         "es": "Libros Que Formaron Mi Pensamiento"},
            "subtitle": {"en": "The books I return to again and again — on brand, leadership, communication, and life.",
                         "es": "Los libros a los que regreso una y otra vez — sobre marca, liderazgo, comunicación y vida."},
        },
        "aurex_portfolio_cfg": {
            "eyebrow":  {"en": "Case Studies",        "es": "Estudios de Caso"},
            "title":    {"en": "Brands I've Built",
                         "es": "Marcas Que He Construido"},
            "subtitle": {"en": "Real results from real clients. Every case study represents a measurable before-and-after transformation.",
                         "es": "Resultados reales de clientes reales. Cada estudio de caso representa una transformación medible antes y después."},
            "cta_text": {"en": "See All Projects",    "es": "Ver Todos los Proyectos"},
        },
        "aurex_gallery_cfg": {
            "eyebrow":  {"en": "Gallery",             "es": "Galería"},
            "title":    {"en": "Life Beyond the Office",
                         "es": "Vida Más Allá de la Oficina"},
            "subtitle": {"en": "Moments from the stage, the studio, retreats, and the places that refuel the mission.",
                         "es": "Momentos del escenario, el estudio, retiros y los lugares que recargan la misión."},
        },
        "aurex_locations_cfg": {
            "eyebrow":  {"en": "My World",            "es": "Mi Mundo"},
            "title":    {"en": "Where Carlos Has Spoken & Advised",
                         "es": "Donde Carlos Ha Hablado y Asesorado"},
            "subtitle": {"en": "From Miami to Madrid — building brands and relationships across the globe.",
                         "es": "Desde Miami hasta Madrid — construyendo marcas y relaciones en todo el mundo."},
        },
    }

    for section_key, fields in config_updates.items():
        # Delete all existing configs for this section (global + all personalities)
        await db.aurex_section_configs.delete_many({"section": section_key})
        # Insert a fresh global config
        await db.aurex_section_configs.insert_one({"section": section_key, **fields})

    print(f"✓ aurex_section_configs ({len(config_updates)} sections)")

    # ─────────────────────────────────────────────────────────────────────
    # 11. AUREX SECTION ITEMS  (global — no pb_personality)
    # ─────────────────────────────────────────────────────────────────────

    def uid():
        return str(uuid.uuid4())

    # ── Audience ────────────────────────────────────────────────────────
    await db.aurex_section_items.delete_many({"section": "aurex_audience"})
    await db.aurex_section_items.insert_many([
        {"section": "aurex_audience", "id": uid(),
         "eyebrow": {"en": "The Expert",       "es": "El Experto"},
         "title":   {"en": "The Established Expert",
                     "es": "El Experto Establecido"},
         "description": {"en": "10+ years of deep expertise, well-respected within your organisation or peer group — but invisible online. You know your knowledge could command premium fees if more people knew who you were.",
                         "es": "Más de 10 años de experiencia profunda, respetado en tu organización — pero invisible online. Sabes que tu conocimiento podría generar honorarios premium si más personas te conocieran."},
         "icon": "Award", "order": 0},
        {"section": "aurex_audience", "id": uid(),
         "eyebrow": {"en": "The Executive",    "es": "El Ejecutivo"},
         "title":   {"en": "The Purpose-Driven Executive",
                     "es": "El Ejecutivo con Propósito"},
         "description": {"en": "You lead high-performing teams and drive real results — but outside your company, nobody knows your name. You want a brand that opens doors to board seats, speaking opportunities, and advisory roles.",
                         "es": "Lideras equipos de alto rendimiento y generas resultados reales — pero fuera de tu empresa, nadie conoce tu nombre. Quieres una marca que abra puertas a consejos, conferencias y roles de asesor."},
         "icon": "Briefcase", "order": 1},
        {"section": "aurex_audience", "id": uid(),
         "eyebrow": {"en": "The Thought Leader", "es": "El Líder de Opinión"},
         "title":   {"en": "The Aspiring Thought Leader",
                     "es": "El Aspirante a Líder de Opinión"},
         "description": {"en": "Brilliant ideas, sharp perspectives, and something genuinely important to say — but no platform to amplify them. You want to build an audience, write the book, land the stage, and become the person people call first.",
                         "es": "Ideas brillantes, perspectivas agudas y algo genuinamente importante que decir — pero sin plataforma para amplificarlas. Quieres construir una audiencia, escribir el libro y llegar al escenario."},
         "icon": "Mic", "order": 2},
        {"section": "aurex_audience", "id": uid(),
         "eyebrow": {"en": "The Entrepreneur",  "es": "El Emprendedor"},
         "title":   {"en": "The Serial Entrepreneur",
                     "es": "El Emprendedor Serial"},
         "description": {"en": "Multiple ventures, multiple wins — but no cohesive personal brand tying it all together. Every new launch feels like starting from scratch. You want a brand that makes your next venture easier and positions you as an ecosystem builder.",
                         "es": "Múltiples empresas, múltiples éxitos — pero ninguna marca personal cohesiva que lo una todo. Quieres una marca que haga tu próximo lanzamiento más fácil y te posicione como constructor de ecosistemas."},
         "icon": "Zap", "order": 3},
    ])

    # ── Process ─────────────────────────────────────────────────────────
    await db.aurex_section_items.delete_many({"section": "aurex_process"})
    await db.aurex_section_items.insert_many([
        {"section": "aurex_process", "id": uid(),
         "title":   {"en": "Brand Discovery",     "es": "Descubrimiento de Marca"},
         "description": {"en": "Deep-dive audit of your digital footprint, competitive landscape, and audience insights. We uncover the authentic story, unique positioning, and core values that will drive your entire brand.",
                         "es": "Auditoría profunda de tu huella digital, el panorama competitivo y los datos de audiencia. Descubrimos la historia auténtica, el posicionamiento único y los valores fundamentales de tu marca."},
         "step_number": "01", "icon": "Search", "order": 0},
        {"section": "aurex_process", "id": uid(),
         "title":   {"en": "Identity Blueprint",  "es": "Blueprint de Identidad"},
         "description": {"en": "We define your visual identity, brand voice, messaging pillars, and unique methodology. You walk away with a complete Brand Bible — the north star for every content decision, pitch, and public appearance.",
                         "es": "Definimos tu identidad visual, voz de marca, pilares de mensajes y metodología única. Sales con una Biblia de Marca completa — la guía para cada decisión de contenido."},
         "step_number": "02", "icon": "Layout", "order": 1},
        {"section": "aurex_process", "id": uid(),
         "title":   {"en": "Platform Strategy",   "es": "Estrategia de Plataforma"},
         "description": {"en": "We build your content ecosystem: LinkedIn mastery, newsletter strategy, podcast or video presence, and a speaking pipeline. Each platform is chosen based on where your ideal clients spend their attention.",
                         "es": "Construimos tu ecosistema de contenido: dominio de LinkedIn, estrategia de newsletter, presencia en podcast o video y una tubería de ponencias. Cada plataforma se elige según donde pasa el tiempo tu cliente ideal."},
         "step_number": "03", "icon": "Globe", "order": 2},
        {"section": "aurex_process", "id": uid(),
         "title":   {"en": "Amplify & Scale",     "es": "Amplificar y Escalar"},
         "description": {"en": "We launch your brand to the world: media pitches, speaking bureau introduction, PR campaign, and community activation. We track authority metrics and continuously optimise your positioning.",
                         "es": "Lanzamos tu marca al mundo: propuestas de medios, introducción a bureaus de conferencias, campaña de PR y activación de comunidad. Rastreamos métricas de autoridad y optimizamos continuamente."},
         "step_number": "04", "icon": "TrendingUp", "order": 3},
    ])

    # ── Pricing ─────────────────────────────────────────────────────────
    await db.aurex_section_items.delete_many({"section": "aurex_pricing"})
    await db.aurex_section_items.insert_many([
        {"section": "aurex_pricing", "id": uid(),
         "name":     {"en": "Starter",     "es": "Inicial"},
         "price":    "$1,500",
         "currency": "one-time",
         "description": {"en": "The perfect starting point for professionals who want clarity on their brand and their first steps toward visibility.",
                         "es": "El punto de partida perfecto para profesionales que quieren claridad sobre su marca y dar sus primeros pasos hacia la visibilidad."},
         "features": "Brand Discovery Session (2hr)\nLinkedIn Profile Audit & Rewrite\n3 Core Messaging Pillars\n30-Day Content Plan\nEmail Support for 30 Days",
         "featured": False, "cta_text": "Get Started", "order": 0},
        {"section": "aurex_pricing", "id": uid(),
         "name":     {"en": "Accelerator", "es": "Acelerador"},
         "price":    "$3,997",
         "currency": "one-time",
         "description": {"en": "The most comprehensive personal brand transformation programme. 12 weeks of intensive 1:1 coaching, full brand build, and content system implementation.",
                         "es": "El programa de transformación de marca personal más completo. 12 semanas de coaching intensivo 1:1, construcción de marca completa e implementación del sistema de contenido."},
         "features": "Everything in Starter\n12 Weekly 1:1 Calls\nFull Brand Kit\nLinkedIn Makeover\n90-Day Content Calendar\nMedia Pitch Templates\n3 Months WhatsApp Support",
         "featured": True, "badge": {"en": "Most Popular", "es": "Más Popular"},
         "cta_text": "Apply Now", "order": 1},
        {"section": "aurex_pricing", "id": uid(),
         "name":     {"en": "Authority",   "es": "Autoridad"},
         "price":    "$8,500",
         "currency": "one-time",
         "description": {"en": "The premium end-to-end brand authority package for senior executives and C-suite leaders who want the gold standard of personal branding.",
                         "es": "El paquete premium de autoridad de marca para ejecutivos senior y líderes de nivel C que quieren el estándar de oro en marca personal."},
         "features": "Everything in Accelerator\n6 Months Weekly Calls\nExecutive Presence Coaching\nMedia Training\nSpeaking Bureau Introduction\nPersonal PR Support\nPriority Access to New Programmes",
         "featured": False, "cta_text": "Inquire Now", "order": 2},
    ])

    # ── Team ─────────────────────────────────────────────────────────────
    await db.aurex_section_items.delete_many({"section": "aurex_team"})
    await db.aurex_section_items.insert_many([
        {"section": "aurex_team", "id": uid(),
         "name": {"en": "Carlos Artiles",    "es": "Carlos Artiles"},
         "role": {"en": "Founder & Lead Brand Strategist",
                  "es": "Fundador y Estratega de Marca Principal"},
         "bio":  {"en": "15+ years helping entrepreneurs and executives build brands that open doors. Former finance professional turned brand authority. Keynote speaker, investor, and creator of the Brand Authority Framework.",
                  "es": "Más de 15 años ayudando a emprendedores y ejecutivos a construir marcas que abren puertas. Ex-profesional de finanzas convertido en autoridad de marca. Orador, inversor y creador del Marco de Autoridad de Marca."},
         "image_url": "", "social_linkedin": "https://linkedin.com/in/carlosartiles",
         "order": 0, "visible": True},
        {"section": "aurex_team", "id": uid(),
         "name": {"en": "María Elena Ruiz",  "es": "María Elena Ruiz"},
         "role": {"en": "Brand Strategy Director",
                  "es": "Directora de Estrategia de Marca"},
         "bio":  {"en": "Former creative director at a top Miami agency. Specialises in visual identity, brand systems, and positioning for B2B professionals and executive brands.",
                  "es": "Ex-directora creativa en una agencia líder de Miami. Especializada en identidad visual, sistemas de marca y posicionamiento para profesionales B2B."},
         "image_url": "", "social_linkedin": "https://linkedin.com/in/mariaelenaruiz",
         "order": 1, "visible": True},
        {"section": "aurex_team", "id": uid(),
         "name": {"en": "Alejandro Cruz",    "es": "Alejandro Cruz"},
         "role": {"en": "Content & LinkedIn Strategist",
                  "es": "Estratega de Contenido y LinkedIn"},
         "bio":  {"en": "Grew his own LinkedIn to 40K followers before joining the team. Now runs content systems for 50+ clients across tech, finance, and consulting. Expert in LinkedIn algorithm and thought leadership content.",
                  "es": "Creció su propio LinkedIn a 40K seguidores antes de unirse al equipo. Ahora gestiona sistemas de contenido para 50+ clientes en tecnología, finanzas y consultoría."},
         "image_url": "", "social_linkedin": "https://linkedin.com/in/alejandrocruz",
         "order": 2, "visible": True},
    ])

    # ── Partners ─────────────────────────────────────────────────────────
    await db.aurex_section_items.delete_many({"section": "aurex_partners"})
    partner_names = [
        "ACapital Group", "Aurex Network", "Brand Authority Press",
        "Executive Insider", "Elevate Media Co.", "Success Media Group",
        "Growth Catalyst Agency", "The Brand Studio",
    ]
    await db.aurex_section_items.insert_many([
        {"section": "aurex_partners", "id": uid(), "name": n, "image_url": "",
         "order": i, "visible": True}
        for i, n in enumerate(partner_names)
    ])

    # ── Clients ─────────────────────────────────────────────────────────
    await db.aurex_section_items.delete_many({"section": "aurex_clients"})
    client_names = [
        "Meridian Capital Partners", "Apex Digital Studios", "Nexus Talent Group",
        "ClearPath Ventures", "Luminary Enterprises", "Pinnacle Consulting Group", "Solaris Group",
    ]
    await db.aurex_section_items.insert_many([
        {"section": "aurex_clients", "id": uid(), "name": n, "image_url": "",
         "order": i, "visible": True}
        for i, n in enumerate(client_names)
    ])

    print("✓ aurex_section_items (audience×4, process×4, pricing×3, team×3, partners×8, clients×7)")

    # ─────────────────────────────────────────────────────────────────────
    # 12. CALENDAR EVENTS  (used by aurex_events section)
    # ─────────────────────────────────────────────────────────────────────
    await db.calendar_events.delete_many({})
    d14 = now + timedelta(days=14)
    d35 = now + timedelta(days=35)
    d60 = now + timedelta(days=60)
    await db.calendar_events.insert_many([
        {
            "title":       {"en": "Personal Brand Masterclass: Zero to Authority",
                            "es": "Masterclass de Marca Personal: De Cero a Autoridad"},
            "description": {"en": "A 3-hour live virtual masterclass covering the Brand Authority Framework from start to finish. Limited to 50 seats.",
                            "es": "Una masterclass en vivo de 3 horas que cubre el Marco de Autoridad de Marca. Limitada a 50 asientos."},
            "start_date":  d14.strftime("%Y-%m-%dT18:00:00"),
            "end_date":    d14.strftime("%Y-%m-%dT21:00:00"),
            "location":    {"en": "Virtual (Zoom)", "es": "Virtual (Zoom)"},
            "event_type":  "virtual",
            "color":       "#E85D04",
            "cta_text":    {"en": "Save My Seat",  "es": "Reservar Mi Lugar"},
            "cta_url":     "#contact",
            "visible": True,
        },
        {
            "title":       {"en": "LinkedIn Authority Bootcamp — 2-Day Online",
                            "es": "Bootcamp de Autoridad en LinkedIn — 2 Días Online"},
            "description": {"en": "Day 1: Profile & Identity. Day 2: Content Strategy & Growth System. Includes templates, worksheets, and 30 days of post-bootcamp email coaching.",
                            "es": "Día 1: Perfil e Identidad. Día 2: Estrategia de Contenido y Sistema de Crecimiento. Incluye plantillas y 30 días de coaching por email."},
            "start_date":  d35.strftime("%Y-%m-%dT09:00:00"),
            "end_date":    (d35 + timedelta(days=1)).strftime("%Y-%m-%dT17:00:00"),
            "location":    {"en": "Virtual (Zoom + Slack Community)", "es": "Virtual (Zoom + Comunidad Slack)"},
            "event_type":  "virtual",
            "color":       "#2563EB",
            "cta_text":    {"en": "Register Now",  "es": "Registrarse Ahora"},
            "cta_url":     "#contact",
            "visible": True,
        },
        {
            "title":       {"en": "Executive Brand Summit — Miami",
                            "es": "Cumbre de Marca Ejecutiva — Miami"},
            "description": {"en": "An exclusive in-person summit for senior executives and C-suite leaders. Full day of keynotes, workshops, and peer networking. Capped at 60 attendees.",
                            "es": "Una cumbre exclusiva en persona para ejecutivos senior y líderes de nivel C. Día completo de keynotes, talleres y networking. Limitada a 60 asistentes."},
            "start_date":  d60.strftime("%Y-%m-%dT08:00:00"),
            "end_date":    d60.strftime("%Y-%m-%dT18:00:00"),
            "location":    {"en": "Miami, FL — Venue TBA", "es": "Miami, FL — Sede por confirmar"},
            "event_type":  "in-person",
            "color":       "#7C3AED",
            "cta_text":    {"en": "Apply for Access", "es": "Aplicar para Acceso"},
            "cta_url":     "#contact",
            "visible": True,
        },
        {
            "title":       {"en": "Monthly Mastermind Call — Members",
                            "es": "Llamada Mensual del Mastermind — Miembros"},
            "description": {"en": "Monthly group coaching call for Group Mastermind members. This month's topic: Content Systems that Scale.",
                            "es": "Llamada mensual de coaching grupal para miembros del Mastermind. Tema de este mes: Sistemas de Contenido que Escalan."},
            "start_date":  (now + timedelta(days=7)).strftime("%Y-%m-%dT18:00:00"),
            "end_date":    (now + timedelta(days=7)).strftime("%Y-%m-%dT20:00:00"),
            "location":    {"en": "Virtual (Zoom)", "es": "Virtual (Zoom)"},
            "event_type":  "virtual",
            "color":       "#059669",
            "cta_text":    {"en": "Join as Member", "es": "Unirme como Miembro"},
            "cta_url":     "#contact",
            "visible": True,
        },
    ])
    print("✓ calendar_events (4)")

    # ─────────────────────────────────────────────────────────────────────
    # 13. NAV PAGES
    # ─────────────────────────────────────────────────────────────────────
    await db.nav_pages.delete_many({})
    await db.nav_pages.insert_many([
        {"title": "Home",         "url": "/",          "show_in_nav": True,  "show_in_footer": False, "order": 0},
        {"title": "About",        "url": "/#about",    "show_in_nav": True,  "show_in_footer": True,  "order": 1},
        {"title": "Services",     "url": "/#services", "show_in_nav": True,  "show_in_footer": True,  "order": 2},
        {"title": "Case Studies", "url": "/#portfolio","show_in_nav": True,  "show_in_footer": True,  "order": 3},
        {"title": "Blog",         "url": "/#blog",     "show_in_nav": True,  "show_in_footer": True,  "order": 4},
        {"title": "Contact",      "url": "/#contact",  "show_in_nav": True,  "show_in_footer": True,  "order": 5},
        {"title": "Member Portal","url": "/my-account","show_in_nav": False, "show_in_footer": True,  "order": 6},
    ])
    print("✓ nav_pages (7)")

    print("\n✅  All seed data applied to carlosartiles_cms — Carlos Artiles Personal Brand Pro is ready!")
    client.close()


asyncio.run(seed())
