import React, { useState, useEffect, useCallback } from 'react';
import { Editor as WangEditor, Toolbar } from '@wangeditor/editor-for-react';
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import '@wangeditor/editor/dist/css/style.css';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

// Helper to ensure valid HTML structure and handle text content safely
const sanitizeContent = (content: string): string => {
  // Handle empty, null, or invalid content
  if (!content || typeof content !== 'string') {
    return '<p><br></p>';
  }

  try {
    // Remove zero-width spaces and other invisible characters
    let cleanContent = content.replace(/[\u200B-\u200D\uFEFF\u2028\u2029]/g, '');
    
    // Create a temporary div to parse HTML content
    const div = document.createElement('div');
    div.innerHTML = cleanContent;
    
    // Function to process text nodes safely
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || '')
          .replace(/[\u200B-\u200D\uFEFF\u2028\u2029]/g, '')
          .replace(/\s+/g, ' ');
        
        if (!text.trim()) {
          return '<br>';
        }
        
        // Ensure text is properly wrapped in a paragraph if it's a direct child
        if (node.parentNode === div) {
          return `<p>${text}</p>`;
        }
        return text;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // Expanded list of allowed tags
        const allowedTags = [
          'p', 'br', 'strong', 'em', 'u', 'img', 'a', 'ul', 'ol', 'li',
          'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ];

        if (!allowedTags.includes(tagName)) {
          const content = Array.from(node.childNodes)
            .map(child => processNode(child))
            .join('');
          return content.trim() ? `<p>${content}</p>` : '<p><br></p>';
        }
        
        // Expanded list of allowed attributes
        const allowedAttrs = [
          'src', 'href', 'class', 'alt', 'style', 'width', 'height',
          'target', 'rel', 'title', 'id', 'colspan', 'rowspan'
        ];

        const attrs = Array.from(element.attributes)
          .filter(attr => allowedAttrs.includes(attr.name))
          .map(attr => `${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`)
          .join(' ');
        
        let children = Array.from(node.childNodes)
          .map(child => processNode(child))
          .join('');

        // Special handling for empty elements
        if (!children.trim()) {
          if (tagName === 'p' || tagName === 'div') {
            return '<p><br></p>';
          }
          if (tagName === 'td' || tagName === 'th') {
            return `<${tagName}${attrs ? ` ${attrs}` : ''}><br></${tagName}>`;
          }
        }

        // Handle self-closing tags
        if (tagName === 'br' || tagName === 'img') {
          return attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
        }
        
        return attrs ? 
          `<${tagName} ${attrs}>${children}</${tagName}>` :
          `<${tagName}>${children}</${tagName}>`;
      }
      
      return '';
    };

    // Process all nodes and ensure proper structure
    let processedContent = Array.from(div.childNodes)
      .map(node => processNode(node))
      .join('');
    
    // Ensure content starts with a paragraph
    if (!processedContent.startsWith('<p>')) {
      processedContent = `<p>${processedContent}</p>`;
    }
    
    // Handle empty content
    if (processedContent === '<p></p>' || !processedContent.trim()) {
      return '<p><br></p>';
    }

    // Clean up multiple consecutive breaks
    processedContent = processedContent
      .replace(/(<br\s*\/?>)+/g, '<br>')
      .replace(/<p>\s*<\/p>/g, '<p><br></p>')
      .replace(/(<p><br><\/p>){2,}/g, '<p><br></p>');

    return processedContent;
  } catch (error) {
    console.error('Error sanitizing content:', error);
    return '<p><br></p>';
  }
};

export function Editor({ content, onChange, onImageUpload }: EditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [localContent, setLocalContent] = useState('<p><br></p>');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize editor with sanitized content
  useEffect(() => {
    if (!isInitialized && content) {
      try {
        const sanitized = sanitizeContent(content);
        setLocalContent(sanitized);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing editor content:', error);
        setLocalContent('<p><br></p>');
      }
    }
  }, [content, isInitialized]);

  // Handle content updates from parent with debounce
  useEffect(() => {
    if (!editor || !isReady || editor.isDestroyed) return;

    const timer = setTimeout(() => {
      try {
        const sanitized = sanitizeContent(content);
        if (sanitized !== localContent) {
          editor.setHtml(sanitized);
          setLocalContent(sanitized);
        }
      } catch (error) {
        console.error('Error updating editor content:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [content, editor, isReady, localContent]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
        setEditor(null);
      }
    };
  }, [editor]);

  // Handle editor initialization
  const handleCreated = useCallback((e: IDomEditor) => {
    setEditor(e);
    setIsReady(true);
  }, []);

  const handleChange = useCallback((editor: IDomEditor) => {
    if (!editor || editor.isDestroyed) return;
    
    try {
      const newHtml = editor.getHtml();
      const sanitized = sanitizeContent(newHtml);
      
      if (sanitized !== localContent) {
        setLocalContent(sanitized);
        onChange(sanitized);
      }
    } catch (error) {
      console.error('Error handling editor change:', error);
    }
  }, [localContent, onChange]);

  const editorConfig: Partial<IEditorConfig> = {
    placeholder: '请输入内容...',
    MENU_CONF: {
      uploadImage: {
        customUpload: async (file: File, insertFn: any) => {
          if (!onImageUpload) return;
          try {
            const url = await onImageUpload(file);
            insertFn(url);
          } catch (error) {
            console.error('Error uploading image:', error);
          }
        }
      }
    },
    onChange: handleChange
  };

  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: []
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="text-xs text-gray-400 mb-2 italic bg-gray-50 p-3 border-b">
        ⚠️ 建议将长图拆分上传，确保加载体验更流畅（最大单图 5MB，总不超过 20MB）
      </div>

      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        className="border-b"
      />

      <WangEditor
        defaultConfig={editorConfig}
        value={localContent}
        onCreated={handleCreated}
        mode="default"
        className="min-h-[400px] max-h-[600px] overflow-y-auto"
      />
    </div>
  );
}