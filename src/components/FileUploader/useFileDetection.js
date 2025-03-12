import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { detectCSVType } from '@/utils/webDataProcessor';
import { CSV_TYPES, CSV_TYPE_DISPLAY_NAMES } from '@/utils/constants';
import { isValidCSVFile } from '@/utils/utils';

/**
 * Hook för att detektera och hantera CSV-filer
 * @returns {Object} Funktioner och data för fildetektering
 */
export function useFileDetection() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);

  // Detektera filtyp när en fil väljs
  useEffect(() => {
    if (!file) {
      setFileType(null);
      setFileContent(null);
      setError(null);
      return;
    }

    const detectFile = async () => {
      try {
        setIsDetecting(true);
        setError(null);

        // Validera att det är en CSV-fil
        if (!isValidCSVFile(file)) {
          throw new Error('Ogiltig filtyp. Endast CSV-filer stöds.');
        }

        // Läs filinnehåll
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const content = event.target.result;
          setFileContent(content);
          
          // Parsa CSV för att få headers
          Papa.parse(content, {
            header: true,
            preview: 1,
            skipEmptyLines: true,
            complete: (results) => {
              try {
                if (!results.meta || !results.meta.fields) {
                  throw new Error('Kunde inte läsa kolumnrubriker från CSV-filen');
                }
                
                // Detektera filtyp baserat på kolumnrubriker
                const detectedType = detectCSVType(results.meta.fields);
                setFileType(detectedType);
                setIsDetecting(false);
              } catch (err) {
                console.error('Fel vid detektering av CSV-typ:', err);
                setError(err.message || 'Kunde inte identifiera filtyp');
                setIsDetecting(false);
              }
            },
            error: (err) => {
              console.error('Fel vid parsning av CSV:', err);
              setError('Kunde inte parsa CSV-filen. Kontrollera filformatet.');
              setIsDetecting(false);
            }
          });
        };
        
        reader.onerror = () => {
          setError('Kunde inte läsa filen');
          setIsDetecting(false);
        };
        
        reader.readAsText(file);
      } catch (err) {
        console.error('Fel vid fildetektering:', err);
        setError(err.message || 'Ett fel uppstod vid filhantering');
        setIsDetecting(false);
      }
    };

    detectFile();
  }, [file]);

  // Nollställ filhanteringen
  const resetFile = () => {
    setFile(null);
    setFileType(null);
    setFileContent(null);
    setError(null);
  };

  // Få visningsnamn för detekterad filtyp
  const getFileTypeDisplayName = () => {
    if (!fileType) return null;
    return CSV_TYPE_DISPLAY_NAMES[fileType] || fileType;
  };

  // Kontrollera om filen är en översiktsfil
  const isOverviewFile = () => fileType === CSV_TYPES.OVERVIEW;

  // Kontrollera om filen är en videofil
  const isVideoFile = () => fileType === CSV_TYPES.VIDEO;

  return {
    file,
    setFile,
    fileType,
    setFileType,
    fileContent,
    isDetecting,
    error,
    resetFile,
    getFileTypeDisplayName,
    isOverviewFile,
    isVideoFile
  };
}