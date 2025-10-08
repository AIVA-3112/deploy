import React from 'react';

interface SimpleMarkdownProps {
  content: string;
}

const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ content }) => {
  // Convert markdown to HTML with basic formatting
  const convertMarkdownToHtml = (text: string): string => {
    // Convert headers
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Convert bold text
    text = text.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    
    // Convert italic text
    text = text.replace(/\*(.*)\*/gim, '<em>$1</em>');
    
    // Convert unordered lists
    text = text.replace(/^\* (.*)$/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    
    // Convert line breaks
    text = text.replace(/\n/g, '<br />');
    
    return text;
  };

  return (
    <div 
      className="whitespace-pre-wrap break-words"
      dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(content) }}
    ></div>
  );
};

export default SimpleMarkdown;