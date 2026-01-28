import { useState, useEffect, useRef } from 'react';

export default function NumeroCompteurInput({ value, onChange, disabled }) {
  const [digits, setDigits] = useState([]);
  const inputRefs = useRef([]);

  // 6 cases BLEUES (m³) + 4 cases VERTES (décimales) = 10 total
  const m3Length = 6;
  const decimalLength = 4;
  const totalLength = 10;

  useEffect(() => {
    const v = (value || '').padEnd(totalLength, ' ');
    setDigits(v.split('').slice(0, totalLength));
  }, [value]);

  const handleChange = (i, v) => {
    const c = v.slice(-1).replace(/[^0-9]/g, ''); // Que des chiffres
    const nd = [...digits];
    nd[i] = c || ' ';
    setDigits(nd);
    onChange(nd.join('').trimEnd());
    if (c && i < totalLength - 1) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!digits[i] || digits[i] === ' ') {
        if (i > 0) inputRefs.current[i - 1]?.focus();
      } else {
        const nd = [...digits];
        nd[i] = ' ';
        setDigits(nd);
        onChange(nd.join('').trimEnd());
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < totalLength - 1) {
      inputRefs.current[i + 1]?.focus();
    } else if (e.key === 'Delete') {
      const nd = [...digits];
      nd[i] = ' ';
      setDigits(nd);
      onChange(nd.join('').trimEnd());
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const t = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, totalLength);
    const nd = t.padEnd(totalLength, ' ').split('');
    setDigits(nd);
    onChange(t);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 6 cases BLEUES pour m³ */}
      <div className="flex gap-1">
        {digits.slice(0, m3Length).map((d, i) => (
          <input
            key={i}
            ref={el => inputRefs.current[i] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d === ' ' ? '' : d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            onFocus={e => e.target.select()}
            disabled={disabled}
            className="w-9 h-11 text-center text-lg font-mono font-bold border-2 border-blue-400 bg-blue-50 rounded focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed hover:border-blue-500 transition-colors"
            placeholder="0"
          />
        ))}
      </div>

      {/* SÉPARATEUR point */}
      <div className="text-2xl font-bold text-gray-500 px-0.5">.</div>

      {/* 4 cases VERTES pour décimales */}
      <div className="flex gap-1">
        {digits.slice(m3Length, totalLength).map((d, idx) => {
          const i = m3Length + idx;
          return (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d === ' ' ? '' : d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={e => e.target.select()}
              disabled={disabled}
              className="w-9 h-11 text-center text-lg font-mono font-bold border-2 border-green-400 bg-green-50 rounded focus:border-green-600 focus:ring-2 focus:ring-green-200 disabled:bg-gray-100 disabled:cursor-not-allowed hover:border-green-500 transition-colors"
              placeholder="0"
            />
          );
        })}
      </div>

      {/* LÉGENDE */}
      <div className="flex gap-3 text-xs text-gray-600 ml-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></div>
          <span>m³</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 border border-green-400 rounded"></div>
          <span>déc.</span>
        </div>
      </div>
    </div>
  );
}
