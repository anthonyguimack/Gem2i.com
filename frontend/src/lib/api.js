import axios from 'axios';
const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const api = axios.create({ baseURL: API, withCredentials: true });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const publicAPI = {
  getSettings: () => api.get('/public/settings'),
  getHero: () => api.get('/public/hero'),
  getHeroSlides: (page = '') => api.get(`/public/hero-slides${page ? `?page=${page}` : ''}`),
  getAbout: (personality) => api.get('/public/about', personality ? { params: { personality } } : {}),
  getServices: (personality) => api.get('/public/services', personality ? { params: { personality } } : {}),
  getBlog: (page = 1, limit = 9, category = '', personality) => api.get(`/public/blog?page=${page}&limit=${limit}&category=${category}${personality ? `&personality=${personality}` : ''}`),
  getBlogDetail: (slug) => api.get(`/public/blog/${slug}`),
  getBooks: (personality) => api.get('/public/books', personality ? { params: { personality } } : {}),
  getMaps: () => api.get('/public/maps'),
  getMapDetail: (slug) => api.get(`/public/maps/${slug}`),
  getMapLocations: (mapType = '', personality) => api.get(`/public/map-locations?map_type=${mapType}${personality ? `&personality=${personality}` : ''}`),
  getGallery: (category = '', personality) => api.get(`/public/gallery?category=${category}${personality ? `&personality=${personality}` : ''}`),
  getGalleryCategories: () => api.get('/public/gallery-categories'),
  getPortfolio: (personality) => api.get('/public/portfolio', personality ? { params: { personality } } : {}),
  getTestimonials: (personality) => api.get('/public/testimonials', personality ? { params: { personality } } : {}),
  getSocialCatalog: () => api.get('/public/social-catalog'),
  getSections: () => api.get('/public/sections'),
  getPage: (type) => api.get(`/public/page/${type}`),
  getNavPages: () => api.get('/public/nav-pages'),
  getSitePages: () => api.get('/public/site-pages'),
  getSeo: (path) => api.get(`/public/seo/${path}`),
  getGalleryAlbums: () => api.get('/public/gallery-albums'),
  getAlbumPhotos: (albumId) => api.get(`/public/gallery-albums/${albumId}/photos`),
  getServiceDetail: (id) => api.get(`/public/services/${id}`),
  getMyAccountLinks: () => api.get('/public/myaccount-links'),
  getMyAccountNav: () => api.get('/public/myaccount-nav'),
  getBlockedDates: () => api.get('/public/blocked-dates'),
  getCaptchaConfig: () => api.get('/public/captcha-config'),
  // gem2i product content (homepage/static-section copy from gem_config)
  getGemContent: () => api.get('/public/gem/gem-content'),
};

// gem2i Phase-2 catalogs (routes/gem_catalogs.py). Member calls carry the
// shared bearer token via the interceptor — identity always from JWT.
export const gemAPI = {
  artists: (params) => api.get('/public/gem/artists', { params }),
  artistDetail: (slug) => api.get(`/public/gem/artists/${slug}`),
  venues: (params) => api.get('/public/gem/venues', { params }),
  venueDetail: (slug) => api.get(`/public/gem/venues/${slug}`),
  festivals: (params) => api.get('/public/gem/festivals', { params }),
  festivalDetail: (slug) => api.get(`/public/gem/festivals/${slug}`),
  conferences: (params) => api.get('/public/gem/conferences', { params }),
  conferenceDetail: (slug) => api.get(`/public/gem/conferences/${slug}`),
  events: (params) => api.get('/public/gem/events', { params }),
  eventDetail: (slug) => api.get(`/public/gem/events/${slug}`),
  clients: () => api.get('/public/gem/clients'),
  genres: () => api.get('/public/gem/genres'),
  continents: () => api.get('/public/gem/continents'),
  venueCountries: () => api.get('/public/gem/venue-countries'),
  artistNames: (q, roster) => api.get('/public/gem/artist-names', { params: { q, roster } }),
  follow: (kind, targetId, flag) => api.post('/member/gem/follow', { kind, target_id: targetId, flag }),
  myFollows: (kind) => api.get('/member/gem/my-follows', { params: kind ? { kind } : {} }),
  // Phase-4 guest list / waiting list / QR passes (routes/gem_passes.py)
  myEventStatus: (eventId) => api.get(`/member/gem/my-event-status/${eventId}`),
  joinGuestList: (eventId, additionalGuests = 0) => api.post('/member/gem/guest-list', { event_id: eventId, additional_guests: additionalGuests }),
  cancelGuestPass: (eventId) => api.delete(`/member/gem/guest-list/${eventId}`),
  joinWaitingList: (eventId) => api.post('/member/gem/waiting-list', { event_id: eventId }),
  leaveWaitingList: (eventId) => api.delete(`/member/gem/waiting-list/${eventId}`),
  // Phase-5 e-ticketing (routes/gem_tickets.py — Stripe checkout, verified webhook)
  tierAvailability: (eventId) => api.get(`/public/gem/events/${eventId}/tier-availability`),
  checkout: (eventId, tier, quantity) => api.post('/member/gem/checkout', { event_id: eventId, tier, quantity, origin_url: window.location.origin }),
  checkoutStatus: (sessionId) => api.get(`/member/gem/checkout-status/${sessionId}`),
  myTickets: (eventId) => api.get(`/member/gem/my-tickets/${eventId}`),
  // Phase-3 B7 formal-name confirmation gate (routes/gem_passes.py)
  formalName: () => api.get('/member/gem/formal-name'),
  confirmFormalName: (name) => api.post('/member/gem/formal-name', { formal_name: name }),
};

// gem2i catalog admin CRUD (routes/gem_catalogs.py — soft delete, slug uniqueness
// server-side). catalog ∈ artists|venues|venue-types|festivals|conferences|clients|events.
export const gemAdminAPI = {
  list: (catalog, params) => api.get(`/admin/gem/${catalog}`, { params }),
  create: (catalog, data) => api.post(`/admin/gem/${catalog}`, data),
  update: (catalog, id, data) => api.put(`/admin/gem/${catalog}/${id}`, data),
  remove: (catalog, id) => api.delete(`/admin/gem/${catalog}/${id}`),
  // Phase-4 transactions & waiting list (routes/gem_passes.py)
  transactions: (params) => api.get('/admin/gem/transactions', { params }),
  updateTransaction: (id, data) => api.put(`/admin/gem/transactions/${id}`, data),
  waitingList: (eventId) => api.get(`/admin/gem/waiting-list/${eventId}`),
};

export const searchAPI = {
  search: (q) => api.get(`/search?q=${encodeURIComponent(q)}`),
};

// Companies directory (COMPANIES_MIGRATION_PLAN) — member-gated endpoints;
// the shared interceptor attaches the member/admin bearer token.
export const companiesAPI = {
  list: (params) => api.get('/companies', { params }),
  facets: () => api.get('/companies/facets'),
  detail: (slug) => api.get(`/companies/${slug}`),
};

// Opportunities authoring (OPPORTUNITIES_MIGRATION_PLAN) — member-gated.
// Geo cascade reuses the platform geo module (membership.py /geo/*).
export const opportunitiesAPI = {
  types: () => api.get('/opportunity-types'),
  mine: (includeArchived = false) =>
    api.get('/opportunities/mine', { params: { include_archived: includeArchived ? 1 : 0 } }),
  get: (id) => api.get(`/opportunities/mine/${id}`),
  create: (data) => api.post('/opportunities', data),
  update: (id, data) => api.put(`/opportunities/${id}`, data),
  remove: (id) => api.delete(`/opportunities/${id}`),
  upload: (id, kind, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/opportunities/${id}/upload?kind=${kind}`, fd,
      { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  geoCountries: () => api.get('/geo/countries'),
  geoStates: (countryId) => api.get('/geo/states', { params: { country_id: countryId } }),
  geoCities: (stateId) => api.get('/geo/cities', { params: { state_id: stateId } }),
  // Phase 3 — publish, clone, directory, review
  publish: (id) => api.post(`/opportunities/${id}/publish`),
  clone: (id) => api.post(`/opportunities/${id}/clone`),
  listPublished: (typeId = 0) => api.get('/opportunities', { params: typeId ? { type_id: typeId } : {} }),
  detail: (slug) => api.get(`/opportunities/${slug}`),
  reviewQueue: () => api.get('/opportunities/review-queue'),
  reviewView: (id) => api.get(`/opportunities/${id}/review-view`),
  submitReview: (id, flag, comment = '') => api.post(`/opportunities/${id}/review`, { flag, comment }),
  // Phase 2 — sub-entities, FAQ, team
  deleteRow: (id, group, rowId) => api.delete(`/opportunities/${id}/${group}/${rowId}`),
  teamPool: (q = '') => api.get('/opportunities/team-pool', { params: { q } }),
  faqAddTopic: (id, topic) => api.post(`/opportunities/${id}/faq/topics`, { topic }),
  faqRenameTopic: (id, topicId, topic) => api.put(`/opportunities/${id}/faq/topics/${topicId}`, { topic }),
  faqDeleteTopic: (id, topicId) => api.delete(`/opportunities/${id}/faq/topics/${topicId}`),
  faqAddQuestion: (id, data) => api.post(`/opportunities/${id}/faq/questions`, data),
  faqEditQuestion: (id, qid, data) => api.put(`/opportunities/${id}/faq/questions/${qid}`, data),
  faqDeleteQuestion: (id, qid) => api.delete(`/opportunities/${id}/faq/questions/${qid}`),
};

export const blogExternalAPI = {
  // No args → legacy flat feed ({posts}). With a comma-separated `categories`
  // slug list → grouped feed ({sections}) — the block passes its configured
  // KMS categories (EXTERNAL_BLOG_KMS_SECTIONS_PLAN Phase 2/3).
  getLatest: (categories = '', per = 3) =>
    api.get('/blog/latest', categories ? { params: { categories, per } } : undefined),
  // KMS category list for the CMS block-config picker (Phase 4).
  getCategories: () => api.get('/blog/categories'),
};

export const authAPI = {
  login: (email, password, loginType = 'any') => api.post('/auth/login', { email, password, login_type: loginType }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  exchangeSession: (sessionId) => api.post('/auth/session', { session_id: sessionId }),
  forgotPassword: (email, captchaToken) => api.post('/auth/forgot-password', { email, captcha_token: captchaToken }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyResetToken: (token) => api.get(`/auth/reset-password/verify?token=${encodeURIComponent(token)}`),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  generateSsoToken: () => api.post('/auth/sso/generate'),
};

export const contactAPI = { submit: (data) => api.post('/contact', data) };

export const landingAPI = {
  getContent: () => api.get('/public/landing-content'),
  getHeroSlides: () => api.get('/public/landing-hero'),
  subscribe: (data) => api.post('/public/landing-subscribe', data),
  submitContact: (data) => api.post('/public/landing-contact', data),
};

export const checkoutAPI = {
  create: (serviceId, originUrl) => api.post('/checkout', { service_id: serviceId, origin_url: originUrl }),
  status: (sessionId) => api.get(`/checkout/status/${sessionId}`),
};

export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  // Roles & Permissions
  getCmsSections: () => api.get('/admin/cms-sections'),
  getCmsRoles: () => api.get('/admin/cms-roles'),
  createCmsRole: (data) => api.post('/admin/cms-roles', data),
  updateCmsRole: (id, data) => api.put(`/admin/cms-roles/${id}`, data),
  deleteCmsRole: (id) => api.delete(`/admin/cms-roles/${id}`),
  assignMemberCmsRoles: (memberId, roleIds) => api.put(`/admin/members/${memberId}/cms-roles`, { cms_roles: roleIds }),
  getHero: () => api.get('/admin/hero'),
  updateHero: (data) => api.put('/admin/hero', data),
  // Hero Slides CRUD
  getHeroSlides: () => api.get('/admin/hero-slides'),
  getHeroSlide: (id) => api.get(`/admin/hero-slides/${id}`),
  createHeroSlide: (data) => api.post('/admin/hero-slides', data),
  updateHeroSlide: (id, data) => api.put(`/admin/hero-slides/${id}`, data),
  deleteHeroSlide: (id) => api.delete(`/admin/hero-slides/${id}`),
  getAbout: (personality) => api.get('/admin/about', personality ? { params: { personality } } : {}),
  updateAbout: (data, personality) => api.put('/admin/about', data, personality ? { params: { personality } } : {}),
  getServices: (personality) => api.get('/admin/services', personality ? { params: { personality } } : {}),
  createService: (data, personality) => api.post('/admin/services', data, personality ? { params: { personality } } : {}),
  updateService: (id, data) => api.put(`/admin/services/${id}`, data),
  deleteService: (id) => api.delete(`/admin/services/${id}`),
  getBlog: (personality) => api.get('/admin/blog', personality ? { params: { personality } } : {}),
  createBlog: (data, personality) => api.post('/admin/blog', data, personality ? { params: { personality } } : {}),
  updateBlog: (id, data) => api.put(`/admin/blog/${id}`, data),
  deleteBlog: (id) => api.delete(`/admin/blog/${id}`),
  // Blog Categories
  getBlogCategories: () => api.get('/admin/blog-categories'),
  createBlogCategory: (data) => api.post('/admin/blog-categories', data),
  updateBlogCategory: (id, data) => api.put(`/admin/blog-categories/${id}`, data),
  deleteBlogCategory: (id) => api.delete(`/admin/blog-categories/${id}`),
  getBooks: (personality) => api.get('/admin/books', personality ? { params: { personality } } : {}),
  createBook: (data, personality) => api.post('/admin/books', data, personality ? { params: { personality } } : {}),
  updateBook: (id, data) => api.put(`/admin/books/${id}`, data),
  deleteBook: (id) => api.delete(`/admin/books/${id}`),
  getMaps: () => api.get('/admin/maps'),
  createMap: (data) => api.post('/admin/maps', data),
  updateMap: (id, data) => api.put(`/admin/maps/${id}`, data),
  deleteMap: (id) => api.delete(`/admin/maps/${id}`),
  // Companies directory (CMS section "companies", D6)
  getCompanies: (params) => api.get('/admin/companies', { params }),
  getCompany: (id) => api.get(`/admin/companies/${id}`),
  createCompany: (data) => api.post('/admin/companies', data),
  updateCompany: (id, data) => api.put(`/admin/companies/${id}`, data),
  deleteCompany: (id) => api.delete(`/admin/companies/${id}`),
  addCompanyNews: (id, data) => api.post(`/admin/companies/${id}/news`, data),
  updateCompanyNews: (id, newsId, data) => api.put(`/admin/companies/${id}/news/${newsId}`, data),
  deleteCompanyNews: (id, newsId) => api.delete(`/admin/companies/${id}/news/${newsId}`),
  getCompanyTaxonomy: () => api.get('/admin/company-taxonomy'),
  // Sectors
  getSectors: (q = '') => api.get('/admin/company-sectors', { params: { q } }),
  createSector: (data) => api.post('/admin/company-sectors', data),
  updateSector: (id, data) => api.put(`/admin/company-sectors/${id}`, data),
  deleteSector: (id) => api.delete(`/admin/company-sectors/${id}`),
  // Industries
  getIndustries: (params) => api.get('/admin/company-industries', { params }),
  createIndustry: (data) => api.post('/admin/company-industries', data),
  updateIndustry: (id, data) => api.put(`/admin/company-industries/${id}`, data),
  deleteIndustry: (id) => api.delete(`/admin/company-industries/${id}`),
  // Opportunities oversight (OPPORTUNITIES_MIGRATION_PLAN Phase 4)
  getOpportunities: (params) => api.get('/admin/opportunities', { params }),
  setOpportunityBypass: (id, bypass) => api.put(`/admin/opportunities/${id}/bypass`, { bypass_approval: bypass }),
  setOpportunityStatus: (id, status) => api.put(`/admin/opportunities/${id}/status`, { status }),
  deleteOpportunity: (id) => api.delete(`/admin/opportunities/${id}`),
  // Opportunity Types + config (OPPORTUNITIES_MIGRATION_PLAN Phase 0)
  getOpportunityTypes: (q = '') => api.get('/admin/opportunity-types', { params: { q } }),
  createOpportunityType: (data) => api.post('/admin/opportunity-types', data),
  updateOpportunityType: (id, data) => api.put(`/admin/opportunity-types/${id}`, data),
  deleteOpportunityType: (id) => api.delete(`/admin/opportunity-types/${id}`),
  getOpportunitiesConfig: () => api.get('/admin/opportunities-config'),
  updateOpportunitiesConfig: (data) => api.put('/admin/opportunities-config', data),
  getMapLocations: (personality) => api.get('/admin/map-locations', personality ? { params: { personality } } : {}),
  createMapLocation: (data, personality) => api.post('/admin/map-locations', data, personality ? { params: { personality } } : {}),
  updateMapLocation: (id, data) => api.put(`/admin/map-locations/${id}`, data),
  deleteMapLocation: (id) => api.delete(`/admin/map-locations/${id}`),
  getGallery: (personality) => api.get('/admin/gallery', personality ? { params: { personality } } : {}),
  createGallery: (data, personality) => api.post('/admin/gallery', data, personality ? { params: { personality } } : {}),
  updateGallery: (id, data) => api.put(`/admin/gallery/${id}`, data),
  deleteGallery: (id) => api.delete(`/admin/gallery/${id}`),
  reorderGallery: (items) => api.put('/admin/gallery/reorder/batch', { items }),
  // Gallery Categories
  getGalleryCategories: () => api.get('/admin/gallery-categories'),
  createGalleryCategory: (data) => api.post('/admin/gallery-categories', data),
  updateGalleryCategory: (id, data) => api.put(`/admin/gallery-categories/${id}`, data),
  deleteGalleryCategory: (id) => api.delete(`/admin/gallery-categories/${id}`),
  getPortfolio: (personality) => api.get('/admin/portfolio', personality ? { params: { personality } } : {}),
  createPortfolio: (data, personality) => api.post('/admin/portfolio', data, personality ? { params: { personality } } : {}),
  updatePortfolio: (id, data) => api.put(`/admin/portfolio/${id}`, data),
  deletePortfolio: (id) => api.delete(`/admin/portfolio/${id}`),
  getTestimonials: (personality) => api.get('/admin/testimonials', personality ? { params: { personality } } : {}),
  createTestimonial: (data, personality) => api.post('/admin/testimonials', data, personality ? { params: { personality } } : {}),
  updateTestimonial: (id, data) => api.put(`/admin/testimonials/${id}`, data),
  deleteTestimonial: (id) => api.delete(`/admin/testimonials/${id}`),
  getContacts: () => api.get('/admin/contacts'),
  updateContact: (id, data) => api.put(`/admin/contacts/${id}`, data),
  deleteContact: (id) => api.delete(`/admin/contacts/${id}`),
  getPurchases: () => api.get('/admin/purchases'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  getKmsSyncFailures: () => api.get('/admin/kms-sync/failures'),
  retryKmsSync: () => api.post('/admin/kms-sync/retry'),
  getPage: (type) => api.get(`/admin/pages/${type}`),
  updatePage: (type, data) => api.put(`/admin/pages/${type}`, data),
  // Nav Pages
  getNavPages: () => api.get('/admin/nav-pages'),
  createNavPage: (data) => api.post('/admin/nav-pages', data),
  updateNavPage: (id, data) => api.put(`/admin/nav-pages/${id}`, data),
  deleteNavPage: (id) => api.delete(`/admin/nav-pages/${id}`),
  // Gallery Albums
  getGalleryAlbums: () => api.get('/admin/gallery-albums'),
  createGalleryAlbum: (data) => api.post('/admin/gallery-albums', data),
  updateGalleryAlbum: (id, data) => api.put(`/admin/gallery-albums/${id}`, data),
  deleteGalleryAlbum: (id) => api.delete(`/admin/gallery-albums/${id}`),
  // Album Photos
  getAlbumPhotos: (albumId) => api.get(`/admin/album-photos/${albumId}`),
  createAlbumPhoto: (data) => api.post('/admin/album-photos', data),
  updateAlbumPhoto: (id, data) => api.put(`/admin/album-photos/${id}`, data),
  deleteAlbumPhoto: (id) => api.delete(`/admin/album-photos/${id}`),
  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  // SMTP
  testSmtpConnection: (data) => api.post('/admin/smtp/test-connection', data),
  testSmtpEmail: (data) => api.post('/admin/smtp/test-email', data),
  // Email Management — templates + branding wrapper
  listEmailTemplates: () => api.get('/admin/email-templates'),
  getEmailTemplate: (key) => api.get(`/admin/email-templates/${key}`),
  updateEmailTemplate: (key, data) => api.put(`/admin/email-templates/${key}`, data),
  resetEmailTemplate: (key) => api.post(`/admin/email-templates/${key}/reset`),
  previewEmailTemplate: (key, draft) => api.post(`/admin/email-templates/${key}/preview`, draft || {}),
  testSendEmailTemplate: (key, data) => api.post(`/admin/email-templates/${key}/test-send`, data),
  getEmailBranding: () => api.get('/admin/email-branding'),
  updateEmailBranding: (data) => api.put('/admin/email-branding', data),
  // Mail — in-CMS webmail (SES inbound → S3 → Mongo)
  getMailConfig: () => api.get('/admin/mail/config'),
  updateMailConfig: (data) => api.put('/admin/mail/config', data),
  testMailConnection: (data) => api.post('/admin/mail/test-connection', data),
  listMailMessages: (params) => api.get('/admin/mail/messages', { params }),
  getMailMessage: (id) => api.get(`/admin/mail/messages/${id}`),
  setMailRead: (id, read) => api.post(`/admin/mail/messages/${id}/read`, { read }),
  deleteMailMessage: (id, hard) => api.delete(`/admin/mail/messages/${id}`, { params: { hard: !!hard } }),
  downloadMailAttachment: (id, index) => api.get(`/admin/mail/messages/${id}/attachment/${index}`, { responseType: 'blob' }),
  sendMail: (data) => api.post('/admin/mail/send', data),
  syncMail: () => api.post('/admin/mail/sync'),
  listMailMailboxes: () => api.get('/admin/mail/mailboxes'),
  // Mailbox accounts (super-admin provisioning)
  listMailAccounts: () => api.get('/admin/mail/accounts'),
  createMailAccount: (data) => api.post('/admin/mail/accounts', data),
  updateMailAccount: (id, data) => api.put(`/admin/mail/accounts/${id}`, data),
  deleteMailAccount: (id) => api.delete(`/admin/mail/accounts/${id}`),
  // Captcha
  getCaptchaSettings: () => api.get('/admin/captcha-settings'),
  updateCaptchaSettings: (data) => api.put('/admin/captcha-settings', data),
  // Upload
  uploadImage: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  uploadFile: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/upload-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  // Bulk Operations
  bulkDelete: (collection, ids) => api.post('/admin/bulk-delete', { collection, ids }),
  bulkUpdate: (collection, ids, update) => api.post('/admin/bulk-update', { collection, ids, update }),
  // Section Order
  getSectionOrder: (theme) => api.get('/admin/section-order', { params: theme ? { theme } : {} }),
  updateSectionOrder: (order, theme) => api.put('/admin/section-order', theme ? { order, theme } : { order }),
  getSectionConfig: (theme = 'aurex') => api.get('/admin/section-config', { params: { theme } }),
  updateSectionConfig: (configs, theme = 'aurex') => api.put('/admin/section-config', { configs, theme }),
  // SEO
  getSeo: () => api.get('/admin/seo'),
  updateSeo: (pagePath, data) => api.put(`/admin/seo/${pagePath}`, data),
  // Analytics
  getAnalytics: () => api.get('/admin/analytics'),
  // CSV Export
  exportContacts: () => api.get('/admin/contacts/export', { responseType: 'blob' }),
  // Members
  getMembers: () => api.get('/admin/members'),
  createMember: (data) => api.post('/admin/members', data),
  getMember: (id) => api.get(`/admin/members/${id}`),
  updateMember: (id, data) => api.put(`/admin/members/${id}`, data),
  deleteMember: (id) => api.delete(`/admin/members/${id}`),
  assignMentor: (id, data) => api.put(`/admin/members/${id}/mentor`, data),
  getMentors: () => api.get('/admin/mentors'),
  getMemberEbank: (id) => api.get(`/admin/members/${id}/ebank`),
  generateMemberQR: (id, data) => api.post(`/admin/members/${id}/generate-qr`, data),
  // Member Levels
  getLevels: () => api.get('/admin/member-levels'),
  createLevel: (data) => api.post('/admin/member-levels', data),
  updateLevel: (id, data) => api.put(`/admin/member-levels/${id}`, data),
  deleteLevel: (id) => api.delete(`/admin/member-levels/${id}`),
  // Member Types
  getMemberTypes: () => api.get('/admin/member-types'),
  createMemberType: (data) => api.post('/admin/member-types', data),
  updateMemberType: (id, data) => api.put(`/admin/member-types/${id}`, data),
  deleteMemberType: (id) => api.delete(`/admin/member-types/${id}`),
  // Membership Settings
  getMembershipSettings: () => api.get('/admin/membership-settings'),
  updateMembershipSettings: (data) => api.put('/admin/membership-settings', data),
  // Backup & Restore
  exportContent: (collections) => api.get(`/admin/export-content${collections ? `?collections=${collections}` : ''}`),
  importContent: (data) => api.post('/admin/import-content', data),
  // Backup Snapshots
  getBackupSettings: () => api.get('/admin/backup-settings'),
  updateBackupSettings: (data) => api.put('/admin/backup-settings', data),
  listBackups: () => api.get('/admin/backups'),
  getBackup: (id) => api.get(`/admin/backups/${id}`),
  createBackupNow: (label) => api.post('/admin/backups/create-now', { label: label || 'manual' }),
  deleteBackup: (id) => api.delete(`/admin/backups/${id}`),
  // Contact Settings
  getContactSettings: () => api.get('/admin/contact-settings'),
  updateContactSettings: (data) => api.put('/admin/contact-settings', data),
  // System Pages
  seedSystemPages: () => api.post('/admin/seed-system-pages'),
  // Landing Page
  getLandingContent: () => api.get('/admin/landing-content'),
  updateLandingContent: (data) => api.put('/admin/landing-content', data),
  getLandingHeroSlides: () => api.get('/admin/landing-hero'),
  createLandingHeroSlide: (data) => api.post('/admin/landing-hero', data),
  getLandingHeroSlide: (id) => api.get(`/admin/landing-hero/${id}`),
  updateLandingHeroSlide: (id, data) => api.put(`/admin/landing-hero/${id}`, data),
  deleteLandingHeroSlide: (id) => api.delete(`/admin/landing-hero/${id}`),
  getLandingSubscribers: () => api.get('/admin/landing-subscribers'),
  deleteLandingSubscriber: (id) => api.delete(`/admin/landing-subscribers/${id}`),
  getLandingContacts: () => api.get('/admin/landing-contacts'),
  deleteLandingContact: (id) => api.delete(`/admin/landing-contacts/${id}`),
  // My Account Quick Links
  getMyAccountLinks: () => api.get('/admin/myaccount-links'),
  createMyAccountLink: (data) => api.post('/admin/myaccount-links', data),
  updateMyAccountLink: (id, data) => api.put(`/admin/myaccount-links/${id}`, data),
  deleteMyAccountLink: (id) => api.delete(`/admin/myaccount-links/${id}`),
  reorderMyAccountLinks: (ordered_ids) => api.put('/admin/myaccount-links-reorder', { ordered_ids }),
  // My Account Navigation (ordering + visibility of built-in sidebar items)
  getMyAccountNav: () => api.get('/admin/myaccount-nav'),
  updateMyAccountNav: (id, data) => api.put(`/admin/myaccount-nav/${id}`, data),
  reorderMyAccountNav: (ordered_ids) => api.put('/admin/myaccount-nav-reorder', { ordered_ids }),
  // Per-member enrollment Q&A (info modal)
  getMemberEnrollment: (memberId) => api.get(`/admin/members/${memberId}/enrollment`),
  // Per-member signature / disclaimer-acceptance history (news subscribe gate)
  getMemberSignatures: (memberId) => api.get(`/admin/members/${memberId}/signatures`),
  // Per-member cross-portal login / access history (main, frontend, news, KMS)
  getMemberLogins: (memberId) => api.get(`/admin/members/${memberId}/logins`),
  // Member Points / rewards system
  getRewardsConfig: () => api.get('/admin/rewards-config'),
  saveRewardsConfig: (cfg) => api.put('/admin/rewards-config', cfg),
  getRewardsPending: () => api.get('/admin/rewards-pending'),
  fulfillReward: (grantId) => api.post('/admin/rewards-fulfill', { grant_id: grantId }),
  getPointsAnalytics: () => api.get('/admin/points/analytics'),
  getMemberPoints: (memberId) => api.get(`/admin/members/${memberId}/points`),
  adjustMemberPoints: (memberId, points, reason) => api.post(`/admin/members/${memberId}/points-adjust`, { points, reason }),
  // Stripe configuration status (Settings → Stripe tab)
  getStripeStatus: () => api.get('/admin/stripe-status'),
  testStripeConnection: (apiKey) => api.post('/admin/stripe-test', apiKey ? { api_key: apiKey } : {}),
  testDiscordWebhook: (target) => api.post('/admin/discord-test', { target }),
  // Pro Manager (carlos-only; backend 404s unless settings.pro_manager_enabled)
  getPros: () => api.get('/admin/pros'),
  getPro: (id) => api.get(`/admin/pros/${id}`),
  createPro: (data) => api.post('/admin/pros', data),
  updatePro: (id, data) => api.put(`/admin/pros/${id}`, data),
  deletePro: (id) => api.delete(`/admin/pros/${id}`),
  getProAuthors: () => api.get('/admin/pros/authors'),
  getProDefaultTemplate: () => api.get('/admin/pros/default-template'),
  uploadProAttachment: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/admin/pros/${id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteProAttachment: (id, attId) => api.delete(`/admin/pros/${id}/attachments/${attId}`),
  runPro: (id) => api.post(`/admin/pros/${id}/run`),
  getProRuns: (id) => api.get(`/admin/pros/${id}/runs`),
  getProRun: (runId) => api.get(`/admin/pro-runs/${runId}`),
  deleteProRun: (runId) => api.delete(`/admin/pro-runs/${runId}`),
  testClaude: () => api.post('/admin/claude-test'),
  // Calendar
  getCalendarEvents: () => api.get('/admin/calendar/events'),
  createCalendarEvent: (data) => api.post('/admin/calendar/events', data),
  getCalendarEvent: (id) => api.get(`/admin/calendar/events/${id}`),
  updateCalendarEvent: (id, data) => api.put(`/admin/calendar/events/${id}`, data),
  deleteCalendarEvent: (id) => api.delete(`/admin/calendar/events/${id}`),
  getEventRegistrations: (id) => api.get(`/admin/calendar/events/${id}/registrations`),
  getEventRegistrationsCSV: (id) => api.get(`/admin/calendar/events/${id}/registrations/csv`, { responseType: 'blob' }),
  cloneCalendarEvent: (id) => api.post(`/admin/calendar/events/${id}/clone`),
  // Mentorship Schedule
  getMentorshipSlots: () => api.get('/admin/mentorship/slots'),
  createMentorshipSlot: (data) => api.post('/admin/mentorship/slots', data),
  updateMentorshipSlot: (id, data) => api.put(`/admin/mentorship/slots/${id}`, data),
  deleteMentorshipSlot: (id) => api.delete(`/admin/mentorship/slots/${id}`),
  getSlotBookings: (id) => api.get(`/admin/mentorship/slots/${id}/bookings`),
  getMentors: () => api.get('/admin/mentors'),
  // Mentor Slot Templates
  getMentorSlotTemplates: () => api.get('/admin/mentor-slot-templates'),
  createMentorSlotTemplate: (data) => api.post('/admin/mentor-slot-templates', data),
  updateMentorSlotTemplate: (id, data) => api.put(`/admin/mentor-slot-templates/${id}`, data),
  deleteMentorSlotTemplate: (id) => api.delete(`/admin/mentor-slot-templates/${id}`),
  // Blocked Dates
  getBlockedDates: () => api.get('/admin/blocked-dates'),
  createBlockedDate: (data) => api.post('/admin/blocked-dates', data),
  updateBlockedDate: (id, data) => api.put(`/admin/blocked-dates/${id}`, data),
  deleteBlockedDate: (id) => api.delete(`/admin/blocked-dates/${id}`),
  // Admin global bundles
  getAdminBundles: () => api.get('/admin/bundles'),
  createAdminBundle: (d) => api.post('/admin/bundles', d),
  updateAdminBundle: (id, d) => api.put(`/admin/bundles/${id}`, d),
  deleteAdminBundle: (id) => api.delete(`/admin/bundles/${id}`),
  // Payouts
  getPayouts: () => api.get('/admin/payouts'),
  createPayout: (d) => api.post('/admin/payouts', d),
  deletePayout: (id) => api.delete(`/admin/payouts/${id}`),
  // Coupons
  getCoupons: () => api.get('/admin/coupons'),
  getCouponAnalytics: () => api.get('/admin/coupons/analytics'),
  createCoupon: (d) => api.post('/admin/coupons', d),
  updateCoupon: (id, d) => api.put(`/admin/coupons/${id}`, d),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  // Aurex Sections (generic CRUD for all 7 new one-page sections)
  // `personality` = undefined → global doc (Aurex One-page + other themes, unchanged)
  // `personality` = 'business'|'lifestyle'|'personal' → PB mini-site doc
  getAurexConfig:   (section, personality) => api.get(`/admin/aurex/${section}/config`,  personality ? { params: { personality } } : {}),
  saveAurexConfig:  (section, data, personality) => api.put(`/admin/aurex/${section}/config`, data, personality ? { params: { personality } } : {}),
  getAurexItems:    (section, personality) => api.get(`/admin/aurex/${section}/items`,   personality ? { params: { personality } } : {}),
  createAurexItem:  (section, data, personality) => api.post(`/admin/aurex/${section}/items`, data, personality ? { params: { personality } } : {}),
  updateAurexItem:  (section, id, data) => api.put(`/admin/aurex/${section}/items/${id}`, data),  // ID is UUID — no personality needed
  deleteAurexItem:  (section, id) => api.delete(`/admin/aurex/${section}/items/${id}`),           // ID is UUID — no personality needed
  reorderAurexItems:(section, order) => api.put(`/admin/aurex/${section}/reorder`, { order }),
};

// Member API (unified - uses same auth_token)
export const memberAPI = {
  login: (data) => api.post('/auth/login', { email: data.username || data.email, password: data.password }),
  me: () => api.get('/auth/me'),
  // Invite codes
  generateCodes: (count) => api.post('/member/invite-codes/generate', { count }),
  listCodes: () => api.get('/member/invite-codes'),
  sendInvite: (codeId, data) => api.post(`/member/invite-codes/${codeId}/send`, data),
  // Public
  validateCode: (code) => api.get(`/member/validate-code/${code}`),
  register: (data) => api.post('/member/register', data),
  // My Account
  getSponsor: () => api.get('/member/my-sponsor'),
  getMentor: () => api.get('/member/my-mentor'),
  getAvailableMentors: () => api.get('/member/available-mentors'),
  getEbank: () => api.get('/member/ebank'),
  updateEbank: (data) => api.put('/member/ebank', data),
  getEbankActivities: () => api.get('/member/ebank/activities'),
  generateQR: (data) => api.post('/member/generate-qr', data),
  validateSponsor: (num) => api.get(`/member/validate-sponsor/${num}`),
  getCommunity: () => api.get('/member/my-community'),
  updateBiography: (data) => api.put('/member/biography', data),
  updateProfile: (data) => api.put('/member/profile', data),
  // Portfolios
  getPortfolios: () => api.get('/member/portfolios'),
  createPortfolio: (data) => api.post('/member/portfolios', data),
  getPortfolio: (id) => api.get(`/member/portfolios/${id}`),
  updatePortfolio: (id, data) => api.put(`/member/portfolios/${id}`, data),
  deletePortfolio: (id) => api.delete(`/member/portfolios/${id}`),
  // Sectors / Industries / Companies
  getSectors: () => api.get('/member/sectors'),
  getIndustries: (sectorId) => api.get(`/member/industries${sectorId ? `?sector_id=${sectorId}` : ''}`),
  getCompanies: (industryId) => api.get(`/member/companies${industryId ? `?industry_id=${industryId}` : ''}`),
  getMembersList: () => api.get('/member/members-list'),
  getMyLevel: () => api.get('/member/my-level'),
  changePassword: (data) => api.put('/member/change-password', data),
  getMembershipSettings: () => api.get('/public/membership-settings'),
  getProfileActivities: () => api.get('/member/profile-activities'),
  uploadImage: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/member/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  uploadFile: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/member/upload-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  // Mail — My Account webmail (scoped to the member's own mailbox)
  listMailboxes: () => api.get('/member/mail/mailboxes'),
  listMail: (params) => api.get('/member/mail/messages', { params }),
  getMail: (id) => api.get(`/member/mail/messages/${id}`),
  setMailRead: (id, read) => api.post(`/member/mail/messages/${id}/read`, { read }),
  deleteMail: (id, hard) => api.delete(`/member/mail/messages/${id}`, { params: { hard: !!hard } }),
  downloadMailAttachment: (id, index) => api.get(`/member/mail/messages/${id}/attachment/${index}`, { responseType: 'blob' }),
  sendMail: (data) => api.post('/member/mail/send', data),
  syncMail: () => api.post('/member/mail/sync'),
  // Calendar
  getCalendarEvents: () => api.get('/member/calendar/events'),
  getCalendarEvent: (id) => api.get(`/member/calendar/events/${id}`),
  registerEvent: (id) => api.post(`/member/calendar/events/${id}/register`),
  cancelEventRegistration: (id) => api.post(`/member/calendar/events/${id}/cancel`),
  uploadEventFile: (id, data) => api.post(`/member/calendar/events/${id}/upload`, data),
  // Notifications
  getNotifications: () => api.get('/member/notifications'),
  getUnreadCount: () => api.get('/member/notifications/unread-count'),
  markNotificationRead: (id) => api.put(`/member/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/member/notifications/read-all'),
  // Mentorship Calendar
  getMentorSlots: () => api.get('/member/mentorship/slots'),
  createMentorSlot: (data) => api.post('/member/mentorship/slots', data),
  updateMentorSlot: (id, data) => api.put(`/member/mentorship/slots/${id}`, data),
  deleteMentorSlot: (id) => api.delete(`/member/mentorship/slots/${id}`),
  getMentorCalendar: () => api.get('/member/mentor-calendar'),
  bookMentorSlot: (id, data) => api.post(`/member/mentorship/book/${id}`, data || {}),
  cancelMentorBooking: (id) => api.post(`/member/mentorship/cancel/${id}`),
  getMyBookings: () => api.get('/member/my-bookings'),
  // Mentor earnings
  getMentorEarnings: () => api.get('/member/mentor/earnings'),
  // Member Points (KMS engagement rewards)
  getMyPoints: () => api.get('/member/points'),
  // Session Bundles
  getBundles: () => api.get('/member/bundles'),
  getBundle: (id) => api.get(`/member/bundles/${id}`),
  checkoutBundle: (id, data) => api.post(`/member/bundles/checkout/${id}`, data),

  // Coupons
  validateCoupon: (data) => api.post('/member/coupons/validate', data),
  getBundleCheckoutStatus: (sid) => api.get(`/member/bundles/checkout/status/${sid}`),
  getMyCredits: () => api.get('/member/credits'),
  // Mentor personal bundles
  getMyMentorBundles: () => api.get('/member/mentor/bundles'),
  createMentorBundle: (d) => api.post('/member/mentor/bundles', d),
  updateMentorBundle: (id, d) => api.put(`/member/mentor/bundles/${id}`, d),
  deleteMentorBundle: (id) => api.delete(`/member/mentor/bundles/${id}`),
  // Mentor payouts (personal history)
  getMyPayouts: () => api.get('/member/mentor/payouts'),
  // Mentor Slot Templates (public list, gated by setting server-side)
  getMentorSlotTemplates: () => api.get('/member/mentor-slot-templates'),
  // iCal subscription feed
  getIcalInfo: () => api.get('/member/ical/info'),
  regenerateIcal: () => api.post('/member/ical/regenerate'),
};

// Geo API (public)
export const geoAPI = {
  getCountries: () => api.get('/geo/countries'),
  getStates: (countryId) => api.get(`/geo/states${countryId ? `?country_id=${countryId}` : ''}`),
  getCities: (stateId) => api.get(`/geo/cities${stateId ? `?state_id=${stateId}` : ''}`),
  // Admin
  adminCreateCountry: (data) => api.post('/admin/geo/countries', data),
  adminUpdateCountry: (id, data) => api.put(`/admin/geo/countries/${id}`, data),
  adminDeleteCountry: (id) => api.delete(`/admin/geo/countries/${id}`),
  adminCreateState: (data) => api.post('/admin/geo/states', data),
  adminUpdateState: (id, data) => api.put(`/admin/geo/states/${id}`, data),
  adminDeleteState: (id) => api.delete(`/admin/geo/states/${id}`),
  adminCreateCity: (data) => api.post('/admin/geo/cities', data),
  adminUpdateCity: (id, data) => api.put(`/admin/geo/cities/${id}`, data),
  adminDeleteCity: (id) => api.delete(`/admin/geo/cities/${id}`),
};

export const enrollmentAPI = {
  getFields: () => api.get('/public/enrollment-fields'),
  validateCode: (code) => api.post('/public/enrollment/validate-code', { code }),
  checkEmail: (email) => api.post('/public/enrollment/check-email', { email }),
  submit: (form_data) => api.post('/public/enrollment/submit', { form_data }),
  // Admin
  adminGetFields: () => api.get('/admin/enrollment-fields'),
  adminGetField: (id) => api.get(`/admin/enrollment-fields/${id}`),
  adminCreateField: (data) => api.post('/admin/enrollment-fields', data),
  adminUpdateField: (id, data) => api.put(`/admin/enrollment-fields/${id}`, data),
  adminDeleteField: (id) => api.delete(`/admin/enrollment-fields/${id}`),
  adminToggleVisibility: (id, visible) => api.put(`/admin/enrollment-fields/${id}/visibility`, { visible }),
  adminReorderFields: (ordered_ids) => api.put('/admin/enrollment-fields/reorder', { ordered_ids }),
  adminGetApplications: () => api.get('/admin/enrollment-applications'),
  getStep4Content: () => api.get('/public/enrollment-content/step4'),
  adminGetStep4Content: () => api.get('/admin/enrollment-content/step4'),
  adminUpdateStep4Content: (data) => api.put('/admin/enrollment-content/step4', data),
};

export default api;
