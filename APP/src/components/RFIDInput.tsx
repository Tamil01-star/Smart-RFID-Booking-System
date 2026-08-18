import React, { useRef, useState, useEffect } from 'react';

interface RFIDInputProps {
  value: string; // Expected format: 'CA53F754' without spaces
  onChange: (value: string) => void;
}

export default function RFIDInput({ value, onChange }: RFIDInputProps) {
  // Convert hex string to 4 boxes of 2 characters each (4 bytes = 8 characters)
  const parseValueToBoxes = (val: string) => {
    const boxes = Array(4).fill('');
    const cleanVal = val.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    for (let i = 0; i < 4; i++) {
      boxes[i] = cleanVal.substring(i * 2, i * 2 + 2);
    }
    return boxes;
  };

  const [boxes, setBoxes] = useState<string[]>(parseValueToBoxes(value));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setBoxes(parseValueToBoxes(value));
  }, [value]);

  const updateValue = (newBoxes: string[]) => {
    setBoxes(newBoxes);
    onChange(newBoxes.join(''));
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    
    // If they pasted a whole UID (e.g. 8 hex characters), distribute 2-by-2
    if (val.length > 2) {
      const cleanVal = val.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      const newBoxes = [...boxes];
      for (let i = 0; i < 4 && i * 2 < cleanVal.length; i++) {
        newBoxes[i] = cleanVal.substring(i * 2, i * 2 + 2);
      }
      updateValue(newBoxes);
      // Focus the last filled box
      const lastIndex = Math.min(3, Math.floor((cleanVal.length - 1) / 2));
      inputsRef.current[lastIndex]?.focus();
      return;
    }

    const newBoxes = [...boxes];
    newBoxes[index] = val;
    updateValue(newBoxes);

    // Auto-advance to next box when current box has 2 characters
    if (val.length === 2 && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !boxes[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2">
      {boxes.map((boxVal, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          maxLength={2}
          value={boxVal}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-12 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 uppercase tracking-wider bg-white text-gray-900"
          placeholder="00"
        />
      ))}
    </div>
  );
}
