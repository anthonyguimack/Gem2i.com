import React, { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// `<a class="btn">` = a branded email button (utils/email_render.py styles it).
// Quill's plain Link format drops unknown classes on every save, so an edited
// template silently lost its button. Registering a Link subclass keyed on the
// `btn` class makes Quill parse those anchors as this blot and keep the class.
const Link = Quill.import('formats/link');
class ButtonLink extends Link {
  static blotName = 'btnlink';
  static className = 'btn';
}
Quill.register(ButtonLink, true);
Quill.import('ui/icons').btnlink =
  '<svg viewBox="0 0 18 18"><rect class="ql-stroke" x="2" y="5" width="14" height="8" rx="3"/>' +
  '<line class="ql-stroke" x1="6" x2="12" y1="9" y2="9"/></svg>';

const BASE_TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  [{ color: ['#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff', '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff', false] }, { background: [] }],
  ['link', 'image'],
  ['blockquote', 'code-block'],
  ['clean'],
];

// Toggle the selected link between a plain link and a branded button.
function toggleButtonLink() {
  const range = this.quill.getSelection();
  if (!range) return;
  const fmt = this.quill.getFormat(range);
  if (fmt.btnlink) {
    this.quill.format('btnlink', false, 'user');
    this.quill.format('link', fmt.btnlink, 'user');
  } else if (fmt.link) {
    this.quill.format('link', false, 'user');
    this.quill.format('btnlink', fmt.link, 'user');
  }
}

export default function RichTextEditor({ value, onChange, placeholder, emailButtons = false }) {
  const modules = useMemo(() => (emailButtons
    ? {
        toolbar: {
          container: BASE_TOOLBAR.map(g => (g.includes('link') ? [...g, 'btnlink'] : g)),
          handlers: { btnlink: toggleButtonLink },
        },
      }
    : { toolbar: BASE_TOOLBAR }), [emailButtons]);

  return (
    <div className="rich-editor" data-testid="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder || 'Write content here...'}
        style={{ minHeight: '200px' }}
      />
    </div>
  );
}
