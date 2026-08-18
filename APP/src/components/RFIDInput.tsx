import React, { useRef, useState, useEffect } from 'react';

interface RFIDInputProps {
  value: string; // Expected format: 'CA53F754' without spaces
  onChange: (value: string) => void;
}

export default function RFIDInput({ value, onChange }: RFIDInputProps) {
  // Convert 'CA53F754' to ['C', 'A', '5', '3', 'F', '7', '5', '4']
  const parseValueToBoxes = (val: string) => {
    const boxes = Array(8).fill('');
    const cleanVal = val.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    for (let i = 0; i < 8; i++) {
      boxes[i] = cleanVal.substring(i, i + 1);
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
    
    // If they pasted a whole UID into one box, distribute it
    if (val.length > 1) {
      const cleanVal = val.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      const newBoxes = [...boxes];
      for (let i = 0; i < 8 && i < cleanVal.length; i++) {
        newBoxes[i] = cleanVal.substring(i, i + 1);
      }
      updateValue(newBoxes);
      // Focus the last filled box
      const lastIndex = Math.min(7, cleanVal.length - 1);
      inputsRef.current[lastIndex]?.focus();
      return;
    }

    const newBoxes = [...boxes];
    newBoxes[index] = val;
    updateValue(newBoxes);

    // Auto-advance
    if (val.length === 1 && index < 7) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !boxes[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-1.5">
      {boxes.map((boxVal, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          maxLength={8} // Allow paste
          value={boxVal}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-10 h-10 text-center text-lg font-bold border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 uppercase tracking-wider bg-white text-gray-900"
          placeholder="0"
        />
      ))}
    </div>
  );
}
