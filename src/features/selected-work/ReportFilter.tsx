type FilterProps<Value extends string | number> = {
  label: string
  value: Value
  options: readonly Value[]
  optionLabel: (option: Value) => string
  onChange: (value: Value) => void
}

export function ReportFilter<Value extends string | number>({ label, value, options, optionLabel, onChange }: FilterProps<Value>) {
  return (
    <label>
      {label}
      <select value={value} onChange={event => {
        const selected = options.find(option => String(option) === event.currentTarget.value)
        if (selected !== undefined) onChange(selected)
      }}>
        {options.map(option => <option key={option} value={option}>{optionLabel(option)}</option>)}
      </select>
    </label>
  )
}
