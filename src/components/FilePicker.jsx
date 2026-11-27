import { useState } from 'react';

/**
 * A label that opens a file dialog on click and also accepts a dropped file.
 * The caller validates the file; this only delivers it.
 */
export function FilePicker({ accept, onFile, className = '', inputLabel, children, ...rest }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    // Clear the picker so choosing the same file again still fires onChange.
    event.target.value = '';
    if (file) onFile(file);
  };

  return (
    <label
      className={`${className}${isDragging ? ' is-dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...rest}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="visually-hidden"
        aria-label={inputLabel}
      />
      {children}
    </label>
  );
}
