import React, { useState } from 'react';
import { Editor } from './Editor';

interface RichTextEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onImageUpload: (file: File) => Promise<string>;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = '',
  onContentChange,
  onImageUpload,
  className = ''
}) => {
  const [content, setContent] = useState(initialContent);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <h2 className="text-lg font-medium text-gray-900 mb-6">图文详情</h2>
      <Editor
        content={content}
        onChange={handleContentChange}
        onImageUpload={onImageUpload}
      />
    </div>
  );
};
