import { useState, useEffect, useRef } from 'react';

export default function NumeroCompteurInput({ value, onChange, disabled, maxLength = 15 }) {
  const [digits, setDigits] = useState([]);
  const inputRefs = useRef([]);

  useEffect(() => {
    const valueStr = (value || '').padEnd(maxLength, ' ');
    setDigits(valueStr.split('').slice(0, maxLength));
  }, [value, maxLength]);

  const handleDigitChange = (index, newValue) => {
    const char = newValue.slice(-1).toUpperCase();
    const newDigits = [...digits];
    newDigits[index] = char || ' ';
    setDigits(newDigits);
    onChange(newDigits.join('').trimEnd());
    if (char && index < maxLength - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] || digits[index] === ' ') {
        if (index > 0) inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = ' ';
        setDigits(newDigits);
        onChange(newDigits.join('').trimEnd());
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < maxLength - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Delete') {
      const newDigits = [...digits];
      newDigits[index] = ' ';
      setDigits(newDigits);
      onChange(newDigits.join('').trimEnd());
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').slice(0, maxLength);
    const newDigits = pastedText.padEnd(maxLength, ' ').split('');
    setDigits(newDigits);
    onChange(pastedText);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {digits.map((digit, index) => (
        <input key={index} ref={(el) => (inputRefs.current[index] = el)} type="text" maxLength={1}
          value={digit === ' ' ? '' : digit} onChange={(e) => handleDigitChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)} onPaste={index === 0 ? handlePaste : undefined}
          onFocus={(e) => e.target.select()} disabled={disabled}
          className="w-10 h-12 text-center text-lg font-mono font-bold border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed uppercase transition-all hover:border-gray-400"
          placeholder="·" />
      ))}
    </div>
  );
}
