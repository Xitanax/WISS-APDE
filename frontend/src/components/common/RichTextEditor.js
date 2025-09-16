import React, { useEffect, useRef } from 'react';

const TOOLBAR_BUTTONS = [
  { command: 'bold', label: 'Fett' },
  { command: 'italic', label: 'Kursiv' },
  { command: 'underline', label: 'Unterstrichen' },
  { command: 'insertUnorderedList', label: '• Liste' },
  { command: 'insertOrderedList', label: '1. Liste' }
];

const looksLikeHtml = (value = '') => /<\/?[a-z][\s\S]*>/i.test(value);

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextValue = value || '';
    if (looksLikeHtml(nextValue)) {
      if (editor.innerHTML !== nextValue) {
        editor.innerHTML = nextValue;
      }
    } else if (editor.innerText !== nextValue) {
      editor.innerText = nextValue;
    }
  }, [value]);

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor || typeof onChange !== 'function') return;
    onChange(editor.innerHTML);
  };

  const handleCommand = (command) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, null);
    handleInput();
  };

  return (
    <div className="rich-text-wrapper">
      <div className="rich-text-toolbar">
        {TOOLBAR_BUTTONS.map((button) => (
          <button
            key={button.command}
            type="button"
            onClick={() => handleCommand(button.command)}
            className="rich-text-button"
          >
            {button.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
      />
    </div>
  );
};

export default RichTextEditor;
