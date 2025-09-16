const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'U']);

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const sanitizeHtmlString = (value = '') => {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return escapeHtml(value);
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  const { body } = doc;

  const sanitizeNode = (node) => {
    const children = Array.from(node.childNodes);

    children.forEach((child) => {
      if (child.nodeType === 1) {
        if (!ALLOWED_TAGS.has(child.tagName)) {
          const fragment = doc.createDocumentFragment();
          Array.from(child.childNodes).forEach((grandChild) => {
            fragment.appendChild(grandChild);
          });
          child.replaceWith(fragment);
        } else {
          Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));
          sanitizeNode(child);
        }
      } else if (child.nodeType === 8) {
        child.remove();
      }
    });
  };

  sanitizeNode(body);
  return body.innerHTML;
};

export const formatRichText = (value = '') => {
  if (!value) return '';

  if (HTML_TAG_REGEX.test(value)) {
    return sanitizeHtmlString(value);
  }

  return escapeHtml(value).replace(/\n/g, '<br />');
};

export default formatRichText;
