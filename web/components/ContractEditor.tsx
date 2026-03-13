'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Variable {
  name: string;
  label: string;
}

interface ContractEditorProps {
  initialContent?: string;
  variables?: Variable[];
  onContentChange: (content: string) => void;
  className?: string;
}

declare global {
  interface Window {
    tinymce?: any;
  }
}

export function ContractEditor({ 
  initialContent, 
  variables = [], 
  onContentChange, 
  className = '' 
}: ContractEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const tinymceRef = useRef<any>(null);
  const [editorId, setEditorId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 动态加载TinyMCE脚本
    if (typeof window !== 'undefined' && !window.tinymce) {
      const script = document.createElement('script');
      script.src = 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js';
      script.async = true;
      script.onload = () => {
        setIsLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load TinyMCE');
      };
      document.head.appendChild(script);
    } else if (typeof window !== 'undefined') {
      setIsLoaded(true);
    }

    return () => {
      if (typeof window !== 'undefined' && window.tinymce && tinymceRef.current) {
        window.tinymce.remove(tinymceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoaded && editorId && editorRef.current) {
      initEditor();
    }
  }, [isLoaded, editorId]);

  useEffect(() => {
    if (!editorId && typeof window !== 'undefined') {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `contract-editor-${crypto.randomUUID()}`
        : `contract-editor-${Math.random().toString(36).substr(2, 9)}`;
      setEditorId(id);
    }
  }, [editorId]);

  const initEditor = () => {
    if (typeof window !== 'undefined' && window.tinymce && editorRef.current) {
      try {
        window.tinymce.init({
          selector: `#${editorId}`,
          height: 500,
          menubar: true,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; }',
          setup: (editor: any) => {
            tinymceRef.current = editor;
            
            // 添加插入变量按钮
            editor.ui.registry.addMenuButton('insertvariable', {
              text: '插入变量',
              fetch: (callback: any) => {
                const items = variables.map(v => ({
                  type: 'menuitem',
                  text: v.label,
                  onAction: () => {
                    editor.insertContent(`{{${v.name}}}`);
                  }
                }));
                callback(items);
              }
            });
            
            editor.on('Change', () => {
              const content = editor.getContent();
              onContentChange(content);
            });
          }
        });
      } catch (error) {
        console.error('TinyMCE initialization error:', error);
      }
    }
  };

  return (
    <div className={className}>
      <textarea 
        id={editorId} 
        ref={editorRef} 
        defaultValue={initialContent} 
        className="w-full"
      />
    </div>
  );
}
