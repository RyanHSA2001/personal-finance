import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import './Select.css'

export type SelectOption = {
  value: string
  label: string
  // Cor de destaque opcional (bolinha ao lado do nome), ex.: cor da categoria.
  color?: string
  // Texto secundário opcional, ex.: tipo da conta.
  meta?: string
}

type SelectProps = {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

// Dropdown com a aparência do aplicativo. Navegação por teclado: setas, Enter, Espaço e Esc.
function Select({ label, value, options, onChange, placeholder = 'Selecione', disabled = false }: SelectProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  // Fecha ao clicar fora do componente.
  useEffect(() => {
    if (!open) return

    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointer)
    return () => document.removeEventListener('pointerdown', handlePointer)
  }, [open])

  function openMenu() {
    if (disabled || options.length === 0) return
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openMenu()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => Math.min(index + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => Math.max(index - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        break
      case 'Escape':
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className="field select-field" ref={rootRef} data-open={open || undefined}>
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>

      <button
        type="button"
        id={`${id}-trigger`}
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-trigger`}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        {selected?.color && <span className="dot" style={{ background: selected.color }} aria-hidden="true" />}
        <span className={`select-value ${selected ? '' : 'is-placeholder'}`}>
          {selected?.label ?? (options.length === 0 ? 'Nenhuma opção' : placeholder)}
        </span>
        <svg className="select-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul id={`${id}-list`} className="select-menu" role="listbox" aria-labelledby={`${id}-label`}>
          {options.map((option, index) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                className="select-option"
                data-active={index === active || undefined}
                data-selected={isSelected || undefined}
                style={{ '--delay': `${Math.min(index, 8) * 22}ms` } as CSSProperties}
                onMouseEnter={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                {option.color && (
                  <span className="select-option-swatch" style={{ background: option.color }} aria-hidden="true" />
                )}
                <span className="select-option-text">
                  <span className="select-option-label">{option.label}</span>
                  {option.meta && <span className="select-option-meta">{option.meta}</span>}
                </span>
                {isSelected && (
                  <svg className="select-check" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m5 12.5 4.2 4.2L19 7" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Select
