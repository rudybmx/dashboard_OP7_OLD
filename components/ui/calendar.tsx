import {
  addDays,
  addMonths, endOfDay,
  endOfMonth,
  endOfWeek, format, isEqual,
  isSameDay,
  isSameMonth, isToday,
  isValid,
  isWithinInterval, parse, startOfDay,
  startOfMonth,
  startOfWeek, sub,
  subDays, subHours, subMinutes,
  subMonths,
  subWeeks, subYears
} from "date-fns";
import React, { useEffect, useMemo, useRef, useState } from "react";
// Adjust paths based on where you placed the dependencies
import { Button } from "@/components/ui/button-1"; 
import { Material } from "@/components/ui/material-1";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select-1";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { useClickOutside } from "@/components/ui/use-click-outside";
import clsx from "clsx";
import { ptBR } from "date-fns/locale"; // CHANGED: Locale PT-BR
import { twMerge } from "tailwind-merge";

// ... (Keep Icon Components ClockIcon, ArrowBottomIcon, etc. EXACTLY AS ORIGINAL) ...
const ClockIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8ZM16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM8.75 4.75V4H7.25V4.75V7.875C7.25 8.18976 7.39819 8.48615 7.65 8.675L9.55 10.1L10.15 10.55L11.05 9.35L10.45 8.9L8.75 7.625V4.75Z" className="fill-gray-1000"/></svg>);
const ArrowBottomIcon = ({ className }: { className?: string }) => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16" className={clsx("fill-gray-1000", className)}><path fillRule="evenodd" clipRule="evenodd" d="M14.0607 5.49999L13.5303 6.03032L8.7071 10.8535C8.31658 11.2441 7.68341 11.2441 7.29289 10.8535L2.46966 6.03032L1.93933 5.49999L2.99999 4.43933L3.53032 4.96966L7.99999 9.43933L12.4697 4.96966L13 4.43933L14.0607 5.49999Z"/></svg>);
const ArrowLeftIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M10.5 14.0607L9.96966 13.5303L5.14644 8.7071C4.75592 8.31658 4.75592 7.68341 5.14644 7.29289L9.96966 2.46966L10.5 1.93933L11.5607 2.99999L11.0303 3.53032L6.56065 7.99999L11.0303 12.4697L11.5607 13L10.5 14.0607Z" className="fill-gray-700"/></svg>);
const ArrowRightIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M5.50001 1.93933L6.03034 2.46966L10.8536 7.29288C11.2441 7.68341 11.2441 8.31657 10.8536 8.7071L6.03034 13.5303L5.50001 14.0607L4.43935 13L4.96968 12.4697L9.43935 7.99999L4.96968 3.53032L4.43935 2.99999L5.50001 1.93933Z" className="fill-gray-700"/></svg>);
const CalendarIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M5.5 0.5V1.25V2H10.5V1.25V0.5H12V1.25V2H14H15.5V3.5V13.5C15.5 14.8807 14.3807 16 13 16H3C1.61929 16 0.5 14.8807 0.5 13.5V3.5V2H2H4V1.25V0.5H5.5ZM2 3.5H14V6H2V3.5ZM2 7.5V13.5C2 14.0523 2.44772 14.5 3 14.5H13C13.5523 14.5 14 14.0523 14 13.5V7.5H2Z"/></svg>);
const ClearIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M12.4697 13.5303L13 14.0607L14.0607 13L13.5303 12.4697L9.06065 7.99999L13.5303 3.53032L14.0607 2.99999L13 1.93933L12.4697 2.46966L7.99999 6.93933L3.53032 2.46966L2.99999 1.93933L1.93933 2.99999L2.46966 3.53032L6.93933 7.99999L2.46966 12.4697L1.93933 13L2.99999 14.0607L3.53032 13.5303L7.99999 9.06065L12.4697 13.5303Z"/></svg>);

// --- TRANSLATION & HELPERS ---

const parseRelativeDate = (input: string) => {
  // Simple regex for portuguese "X dias", "X semanas"
  const regex = /(\d+)\s*(dia|semana|mês|ano|hora)s?/i;
  const match = input.match(regex);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1]);
  const unitStr = match[2].toLowerCase();
  
  // Map PT to EN units for date-fns
  const unitMap: Record<string, string> = {
      'dia': 'days',
      'semana': 'weeks',
      'mês': 'months',
      'ano': 'years',
      'hora': 'hours'
  };
  
  const unit = unitMap[unitStr] || unitMap[unitStr.slice(0, -1)]; // handle singular/plural roughly

  if (!unit) return null;

  const now = new Date();
  const start = startOfDay(sub(now, { [unit]: value }));
  const end = endOfDay(now);

  return {
    [input]: { text: input, start, end }
  };
};

const parseFixedRange = (input: string) => {
  const rangePattern = /(.+)\s*[-–]\s*(.+)/;
  const match = input.match(rangePattern);
  if (!match) return parseExactDate(input);

  const [, startStr, endStr] = match;
  if (!startStr || !endStr) return null;

  const possibleFormats = ["d MMM yyyy", "d MMM", "yyyy-MM-dd", "dd/MM/yyyy"];

  for (const formatStr of possibleFormats) {
    const now = new Date();
    const year = now.getFullYear();

    const start = parse(startStr, formatStr, now, { locale: ptBR });
    const end = parse(endStr, formatStr, now, { locale: ptBR });

    const finalStart = isValid(start) ? startOfDay(start) : null;
    const finalEnd = isValid(end) ? endOfDay(end) : null;

    if (finalStart && finalEnd) {
      if (formatStr === "d MMM") {
        finalStart.setFullYear(year);
        finalEnd.setFullYear(year);
      }
      return {
        [input]: { text: input, start: finalStart, end: finalEnd }
      };
    }
  }
  return null;
};

const parseExactDate = (input: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateFormats = ["d MMM yyyy", "d MMM", "yyyy-MM-dd", "dd/MM/yyyy"];

  for (const formatStr of dateFormats) {
    let date = parse(input.trim(), formatStr, now, { locale: ptBR });

    if (isValid(date)) {
      if (formatStr === "d MMM") {
        date.setFullYear(currentYear);
      }
      return {
        [input]: {
          text: input,
          start: startOfDay(date),
          end: endOfDay(date)
        }
      };
    }
  }
  return null;
};

const parseDateInput = (input: string) => {
  const relative = parseRelativeDate(input);
  if (relative) return relative;
  const fixedRange = parseFixedRange(input);
  if (fixedRange) return fixedRange;
  const exact = parseExactDate(input);
  if (exact) return exact;
  return null;
};

const filterPresets = (obj: Record<string, any>, search: string) => {
  if (!search) return obj;
  const searchWords = search.toLowerCase().split("-").filter(Boolean);
  const filtered = Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => {
      const keyLower = value.text.toLowerCase();
      return searchWords.every(word => keyLower.includes(word));
    })
  );
  if (Object.entries(filtered).length > 0) return filtered;

  const parsed = parseDateInput(search);
  if (parsed) return parsed;

  return {};
};

const formatDateRange = (start: Date, end: Date, timezone: string) => {
  // Helper to format with locale
  const formatTz = (date: Date, fmt: string) => formatInTimeZone(date, timezone, fmt, { locale: ptBR });

  const isStartMidnight = isEqual(start, startOfDay(start));
  const isEndEOD = isEqual(end, endOfDay(end));
  const sameDay = isSameDay(start, end);

  if (sameDay) {
    return formatTz(start, isStartMidnight ? "EEE, d MMM" : "EEE, d MMM, HH:mm");
  }

  const sameMonth = formatTz(start, "MMM") === formatTz(end, "MMM") && formatTz(start, "yy") === formatTz(end, "yy");
  const sameYear = formatTz(start, "yy") === formatTz(end, "yy");

  const startHasTime = !isStartMidnight;
  const endHasTime = !isEndEOD;

  if (startHasTime || endHasTime) {
    return `${formatTz(start, startHasTime ? "d MMM, HH:mm" : "d MMM")} - ${formatTz(end, endHasTime ? "d MMM, HH:mm" : "d MMM")}`;
  }

  if (sameMonth) {
    return `${formatTz(start, "MMM")} ${formatTz(start, "d")} - ${formatTz(end, "d")}`;
  }
  if (sameYear) {
    return `${formatTz(start, "d MMM")} - ${formatTz(end, "d MMM")}`;
  }
  return `${formatTz(start, "d MMM yy")} - ${formatTz(end, "d MMM yy")}`;
};

// --- TRANSLATED PRESETS ---
const typeRelativeTimes = [
  { id: 'yesterday', text: "Ontem", start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) },
  { id: 'thisWeek', text: "Esta semana", start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfDay(new Date()) },
  { id: 'lastWeek', text: "Semana passada", start: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) },
  { id: 'thisMonth', text: "Este mês", start: startOfMonth(new Date()), end: endOfDay(new Date()) },
  { id: 'lastMonth', text: "Mês passado", start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
  { id: 'custom', text: "Período customizado", start: null, end: null }
];



interface CalendarComboboxProps {
  stacked: boolean;
  compact: boolean;
  value: RangeValue | null;
  onChange: (date: RangeValue | null) => void;
  presets: { [key: string]: { text: string; start: Date; end: Date } };
  presetIndex?: number;
}

const CalendarCombobox = ({ stacked, compact, value, onChange, presets, presetIndex }: CalendarComboboxProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [currentPreset, setCurrentPreset] = useState<any | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const onFocus = () => setIsOpen(true);
  const onChangeInputValue = (value: string) => setInputValue(value);
  const onClick = (value: any) => {
    setInputValue(value.text);
    setCurrentPreset(value);
    onChange({ start: value.start, end: value.end });
    setIsOpen(false);
  };

  const filteredPresets = filterPresets(presets, inputValue);
  useClickOutside(ref, () => setIsOpen(false));

  useEffect(() => {
    const array = Object.entries(presets);
    if (presetIndex !== undefined && presetIndex >= 0 && presetIndex < array.length) {
      setInputValue(array[presetIndex][1].text);
      setCurrentPreset(array[presetIndex][1]);
      onChange({ start: array[presetIndex][1].start, end: array[presetIndex][1].end });
    }
  }, [presetIndex]);

  useEffect(() => {
    if (currentPreset) {
      if (currentPreset.start !== value?.start || currentPreset.end !== value?.end) {
        setCurrentPreset(null);
        setInputValue("");
      }
    }
  }, [value]);

  return (
    <div ref={ref} className={twMerge(clsx("inline-block text-sm font-sans", compact ? "w-[180px] absolute left-[38px]" : "w-[250px] relative", compact && !isOpen && "pl-[140px]", compact && (isOpen || (currentPreset && currentPreset?.start === value?.start && currentPreset?.end === value?.end)) && "pl-0"))}>
      <Input
        prefix={compact ? undefined : <ClockIcon />}
        prefixStyling={"pl-2.5"}
        suffix={<ArrowBottomIcon className={clsx("duration-200", isOpen && "rotate-180")} />}
        suffixStyling={clsx("cursor-pointer", compact && !isOpen && (!currentPreset || (currentPreset?.start !== value?.start && currentPreset?.end !== value?.end)) && "w-10 !px-0")}
        placeholder="Selecione o Período"
        onFocus={onFocus}
        value={inputValue}
        onChange={onChangeInputValue}
        wrapperClassName={clsx("hover:z-10", stacked && !compact && "rounded-b-none", !stacked && !compact && "rounded-r-none", compact && "rounded-l-none", (isOpen || (compact && currentPreset && currentPreset?.start === value?.start && currentPreset?.end === value?.end)) && "z-10")}
        className={clsx("pl-2 placeholder:!text-gray-1000 placeholder:!opacity-100", compact && !isOpen && (!currentPreset || (currentPreset?.start !== value?.start && currentPreset?.end !== value?.end)) && "!w-0 !px-0")}
      />
      <Material type="menu" className={clsx("absolute z-50 top-12 left-0", compact ? "w-full" : "grid grid-cols-2 w-[200%]", isOpen && "opacity-100", !isOpen && "opacity-0 pointer-events-none duration-200")}>
        <ul className="p-2 border-r border-r-gray-200">
          {Object.entries(filteredPresets).length > 0 ? Object.entries(filteredPresets).map(([key, value]) => (
            <li key={key} className="flex items-center cursor-pointer px-2 w-full h-9 rounded-md hover:bg-gray-alpha-300 active:bg-gray-alpha-300 font-sans text-sm text-gray-1000" onClick={() => onClick(value)}>
              {value.text}
            </li>
          )) : (
            <li className="flex items-center cursor-pointer px-2 w-full h-9 rounded-md hover:bg-gray-alpha-300 active:bg-gray-alpha-300 font-sans text-sm text-gray-1000">
              {inputValue}
            </li>
          )}
        </ul>
        {!compact && (
          <div className="p-4 pr-[30px]">
            <div className="font-sans text-gray-900 text-sm">Sugestões</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {typeRelativeTimes.map((value) => (
                <button key={value.text} className="font-mono text-[13px] text-gray-1000 px-1.5 h-5 inline-flex items-center bg-accents-2 border-none rounded cursor-pointer" onClick={() => onClick(value)}>
                  {value.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </Material>
    </div>
  );
};

export interface RangeValue { start: Date | null; end: Date | null; }

// --- CALENDAR EXPORT ---
interface CalendarProps {
  allowClear?: boolean; compact?: boolean; isDocsPage?: boolean; stacked?: boolean; horizontalLayout?: boolean;
  showTimeInput?: boolean; popoverAlignment?: "start" | "center" | "end";
  value: RangeValue | null; onChange: (date: RangeValue | null) => void;
  presets?: { [key: string]: { text: string; start: Date; end: Date } };
  presetIndex?: number; minValue?: Date; maxValue?: Date;
}

export const Calendar = ({
  allowClear = false, compact = false, isDocsPage = false, stacked = false, horizontalLayout = false,
  showTimeInput = false, popoverAlignment = "start", value, onChange, presets, presetIndex, minValue, maxValue
}: CalendarProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  
  // Internal state for selection before applying
  const [tempRange, setTempRange] = useState<RangeValue>({ start: value?.start || null, end: value?.end || null });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Use Browser Timezone
  const timezones = useMemo(() => ([{ value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: `Local` }]), []);
  const [selectedTimezone] = useState(timezones[0].value);

  // States for inputs (Start/End)
  const [startDateStr, setStartDateStr] = useState<string>("");
  const [endDateStr, setEndDateStr] = useState<string>("");
  
  const calendarRef = useRef<HTMLDivElement | null>(null);
  useClickOutside(calendarRef, () => {
    if (isOpen) {
      setIsOpen(false);
      // Revert temp range to actual value on close without saving
      setTempRange({ start: value?.start || null, end: value?.end || null });
    }
  });

  useEffect(() => {
    // Format input display strings based on temp selection
    setStartDateStr(tempRange.start ? format(tempRange.start, "dd/MM/yyyy") : "");
    setEndDateStr(tempRange.end ? format(tempRange.end, "dd/MM/yyyy") : "");
    
    // Check if current tempRange matches any preset
    const matchedPreset = typeRelativeTimes.find(p => 
      p.start && p.end && tempRange.start && tempRange.end &&
      isSameDay(p.start, tempRange.start) && isSameDay(p.end, tempRange.end)
    );
    setSelectedPresetId(matchedPreset?.id || (tempRange.start || tempRange.end ? 'custom' : null));
  }, [tempRange]);

  useEffect(() => {
    if (isOpen) {
      setTempRange({ start: value?.start || null, end: value?.end || null });
    }
  }, [isOpen, value]);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getDaysArray = (date: Date) => {
    const days = [];
    let day = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const handleDateClick = (day: Date) => {
    if (!tempRange.start || (tempRange.start && tempRange.end)) {
      setTempRange({ start: startOfDay(day), end: null });
      setHoverDate(day);
      setIsSelecting(true);
    } else if (isSelecting) {
      if (day > tempRange.start) {
        setTempRange({ ...tempRange, end: endOfDay(day) });
      } else {
        setTempRange({ start: startOfDay(day), end: endOfDay(tempRange.start) });
      }
      setIsSelecting(false);
      setHoverDate(null);
    }
  };

  const handleMouseEnter = (day: Date) => { if (tempRange.start && !tempRange.end) setHoverDate(day); };

  const applyFilter = () => {
    onChange(tempRange);
    setIsOpen(false);
  };

  const cancelFilter = () => {
    setTempRange({ start: value?.start || null, end: value?.end || null });
    setIsOpen(false);
  };

  const handlePresetClick = (preset: typeof typeRelativeTimes[0]) => {
    if (preset.id === 'custom') return;
    setTempRange({ start: preset.start, end: preset.end });
    if (preset.start) setCurrentDate(preset.start);
    setIsSelecting(false);
  };

  const renderMonth = (monthDate: Date) => {
    const days = getDaysArray(monthDate);
    return (
      <div className="w-[250px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm text-gray-700 font-semibold capitalize text-center w-full">
            {format(monthDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] text-gray-400 font-bold mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const isStart = tempRange.start && isSameDay(day, tempRange.start);
            const isEnd = tempRange.end && isSameDay(day, tempRange.end);
            const isInRange = tempRange.start && (
              (tempRange.end && isWithinInterval(day, { start: tempRange.start, end: tempRange.end })) || 
              (hoverDate && isWithinInterval(day, { 
                start: tempRange.start < hoverDate ? tempRange.start : hoverDate, 
                end: tempRange.start < hoverDate ? hoverDate : tempRange.start 
              }))
            );
            const isCurrentMonth = isSameMonth(day, monthDate);

            return (
              <div 
                key={day.toString()} 
                className={clsx(
                  "flex items-center justify-center text-sm relative h-8 w-8 cursor-pointer transition-all duration-200",
                  !isCurrentMonth && "text-gray-300 opacity-50",
                  isCurrentMonth && "text-gray-700 hover:bg-indigo-50",
                  isInRange && !isStart && !isEnd && "bg-indigo-50 text-indigo-700",
                  (isStart || isEnd) && "bg-indigo-600 text-white rounded-md z-10 shadow-sm font-medium",
                  isStart && tempRange.end && "rounded-r-none",
                  isEnd && tempRange.start && "rounded-l-none"
                )} 
                onMouseEnter={() => handleMouseEnter(day)} 
                onClick={() => handleDateClick(day)}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative isolate">
      <div className="flex items-center">
        <Button
          className={clsx(
            "!justify-start h-11 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors",
            compact ? "w-[180px] gap-1.5" : "w-[240px]"
          )}
          prefix={<CalendarIcon />}
          type="secondary"
          onClick={() => setIsOpen((p) => !p)}
        >
          <div className="truncate pr-2 font-medium">
            {value?.start && value?.end ? (
              <span className="flex items-center gap-1">
                {format(value.start, "dd/MM/yyyy")} <span className="text-indigo-400 text-xs">até</span> {format(value.end, "dd/MM/yyyy")}
              </span>
            ) : "Selecionar Período"}
          </div>
        </Button>
      </div>

      {isOpen && (
        <div 
          ref={calendarRef} 
          className={twMerge(clsx(
            "fixed md:absolute mt-2 p-5 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[9999] flex flex-col gap-5",
            "w-screen md:w-auto left-0 md:left-auto",
            popoverAlignment === "end" ? "md:right-0" : "md:left-0"
          ))}
          style={{ minWidth: compact ? 'auto' : '820px' }}
        >
          {/* Header Inputs */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1.5 block font-medium">Início do período</label>
              <div className="relative">
                 <input 
                  type="text" 
                  value={startDateStr} 
                  readOnly
                  placeholder="dd/mm/aaaa"
                  className="w-full h-10 px-4 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center font-medium bg-slate-50/50"
                 />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1.5 block font-medium">Fim do período</label>
              <div className="relative">
                 <input 
                  type="text" 
                  value={endDateStr} 
                  readOnly
                  placeholder="dd/mm/aaaa"
                  className="w-full h-10 px-4 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center font-medium bg-slate-50/50"
                 />
              </div>
            </div>
            <div className="flex-grow"></div>
          </div>

          <div className="flex gap-8">
            {/* Calendars Block */}
            <div className="flex flex-col gap-6">
              <div className="flex gap-6">
                <div className="relative">
                   <button onClick={prevMonth} className="absolute left-0 top-0 z-10 p-1 hover:bg-slate-100 rounded-lg transition-colors">
                     <ArrowLeftIcon />
                   </button>
                   {renderMonth(currentDate)}
                </div>
                <div className="relative">
                   <button onClick={nextMonth} className="absolute right-0 top-0 z-10 p-1 hover:bg-slate-100 rounded-lg transition-colors">
                     <ArrowRightIcon />
                   </button>
                   {renderMonth(addMonths(currentDate, 1))}
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="w-px bg-slate-100 h-auto self-stretch"></div>

            {/* Sidebar Presets */}
            <div className="w-[180px] flex flex-col gap-1.5 pt-2">
               {typeRelativeTimes.map((preset) => (
                 <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={clsx(
                    "w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-200 font-medium",
                    selectedPresetId === preset.id 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                 >
                   {preset.text}
                 </button>
               ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
             <button 
              onClick={cancelFilter}
              className="px-6 h-10 rounded-lg text-sm font-semibold border border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors"
             >
               Cancelar
             </button>
             <button 
              onClick={applyFilter}
              className="px-8 h-10 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
             >
               Filtrar
             </button>
          </div>

        </div>
      )}
    </div>
  );
};

