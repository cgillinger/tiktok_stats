import React, { useState } from 'react';
import { copyToClipboard } from '@/utils/utils';
import { Copy, Check } from 'lucide-react';

/**
 * Komponent för att visa ett värde som kan kopieras till urklipp
 * med ren formatering när användaren hovrar över den
 * 
 * @param {Object} props - Komponentens props
 * @param {number|string} props.value - Värdet att visa och kopiera
 * @param {string} props.formattedValue - Formaterad version av värdet för visning
 * @param {string} [props.className] - Extra CSS-klasser
 * @param {string} [props.align="left"] - Textjustering ("left", "right", "center")
 */
export function CopyableValue({ value, formattedValue, className = "", align = "left" }) {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Rensa värdet från tusentalsavgränsare mm
  const rawValue = value === undefined || value === null ? '' : String(value);

  const handleCopy = async (e) => {
    e.stopPropagation();
    const success = await copyToClipboard(rawValue);
    
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Justera textjustering baserat på align prop
  const textAlignClass = 
    align === "right" ? "text-right" : 
    align === "center" ? "text-center" : 
    "text-left";

  return (
    <div 
      className={`inline-flex items-center relative group ${textAlignClass} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visa det formaterade värdet */}
      <span className={isHovered ? "text-primary" : ""}>
        {formattedValue}
      </span>
      
      {/* Kopieringsknapp som visas vid hover */}
      {isHovered && (
        <button
          className="ml-1 p-0.5 focus:outline-none rounded-sm hover:bg-primary/10 transition-colors"
          onClick={handleCopy}
          title={`Kopiera värdet: ${rawValue}`}
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-primary/70" />
          )}
        </button>
      )}
    </div>
  );
}