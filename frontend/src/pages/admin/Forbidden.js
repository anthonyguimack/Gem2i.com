import React from 'react';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

/**
 * CMS Section Guard
 * ─────────────────
 * Wraps an admin route component and renders a 403 page (inside the AdminLayout,
 * so the sidebar stays visible for the operator to navigate elsewhere) when the
 * current user's `effective_permissions` array does not include `section`.
 * Admins (`role: "admin"`) always pass through.
 *
 * Usage:
 *   <Route path="blog" element={<CmsSectionGuard section="blog"><BlogManager /></CmsSectionGuard>} />
 */
/**
 * section: string key OR array of keys.
 * Allowed if the user has the role "admin" OR their effective_permissions
 * includes ANY of the supplied keys.
 */
export function CmsSectionGuard({ section, children }) {
  const { user } = useAuth();
  const perms = (user?.effective_permissions) || [];
  const keys = Array.isArray(section) ? section : [section];
  const allowed = user?.role === 'admin' || keys.some(k => perms.includes(k));
  if (!allowed) return <Forbidden section={keys[0]} />;
  return children;
}

export default function Forbidden({ section }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" data-testid="cms-forbidden">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-5">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">403 — Access Denied</h1>
        <p className="text-sm text-slate-500 mb-1">You don't have permission to open this section.</p>
        {section && <p className="text-xs text-slate-400 font-mono">section: {section}</p>}
        <p className="text-sm text-slate-500 mt-4">Use the sidebar on the left to navigate to a section you have access to.</p>
        <Link to="/admin" className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-[#0D9488] text-white rounded-sm text-sm font-medium hover:bg-[#0b7a70]" data-testid="forbidden-back-dashboard">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
