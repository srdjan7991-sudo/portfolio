import { useState } from 'react'
import { useLanguage } from '../../i18n/language'

const itemLimit = 3
const initialQuantity = itemLimit - 1

function addItem(quantity: number) {
  return Math.min(quantity + 1, itemLimit)
}

function addWithoutLimit(quantity: number) {
  return quantity + 1
}

const checks = [
  { id: 'increment', input: initialQuantity, expected: itemLimit },
  { id: 'limit', input: itemLimit, expected: itemLimit },
] as const

const copy = {
  en: {
    codeView: 'Code view',
    implementation: 'Implementation',
    test: 'Tests',
    quantity: 'Quantity',
    add: 'Add item',
    reset: 'Reset quantity',
    regression: 'Remove the quantity limit',
    run: 'Run checks',
    testNote: 'The component test clicks Add item twice. The checks below run the quantity rule used by that button.',
    increment: 'Adds one item below the limit',
    limit: 'Keeps the quantity at the limit',
    passed: 'Passed',
    failed: 'Failed',
    expected: 'Expected',
    actual: 'Actual',
  },
  sr: {
    codeView: 'Prikaz koda',
    implementation: 'Implementacija',
    test: 'Testovi',
    quantity: 'Količina',
    add: 'Dodaj stavku',
    reset: 'Resetuj količinu',
    regression: 'Ukloni ograničenje količine',
    run: 'Pokreni provere',
    testNote: 'Test komponente dva puta aktivira dugme Dodaj stavku. Provere ispod primenjuju isto pravilo promene količine kao dugme.',
    increment: 'Dodaje jednu stavku ispod ograničenja',
    limit: 'Zadržava maksimalnu količinu',
    passed: 'Uspešna',
    failed: 'Neuspešna',
    expected: 'Očekivano',
    actual: 'Dobijeno',
  },
}

function implementationSnippet(removeLimit: boolean, text: typeof copy.en) {
  return `function addItem(quantity: number) {
  return ${removeLimit ? 'quantity + 1' : `Math.min(quantity + 1, ${itemLimit})`}
}

function AddItem() {
  const [quantity, setQuantity] = useState(${initialQuantity})
  return (
    <>
      <output aria-live="polite">${text.quantity} {quantity}</output>
      <button onClick={() => setQuantity(addItem)}>${text.add}</button>
    </>
  )
}`
}

function testSnippet(text: typeof copy.en) {
  return `test('${text.limit}', async () => {
  const user = userEvent.setup()
  render(<AddItem />)
  const add = screen.getByRole('button', {
    name: '${text.add}',
  })
  await user.click(add)
  await user.click(add)
  expect(screen.getByRole('status'))
    .toHaveTextContent('${text.quantity} ${itemLimit}')
})`
}

type CheckResult = { id: typeof checks[number]['id']; expected: number; actual: number }

export function QualityDemo() {
  const { language } = useLanguage()
  const text = copy[language]
  const [testing, setTesting] = useState(false)
  const [removeLimit, setRemoveLimit] = useState(false)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [results, setResults] = useState<CheckResult[]>([])
  const updateQuantity = removeLimit ? addWithoutLimit : addItem

  function changeLimit(removed: boolean) {
    setRemoveLimit(removed)
    setQuantity(initialQuantity)
    setResults([])
  }

  function runChecks() {
    setResults(checks.map(({ id, input, expected }) => ({ id, expected, actual: updateQuantity(input) })))
  }

  return (
    <>
      <fieldset className="engineer-demo-controls" aria-label={text.codeView}>
        <button type="button" className="engineer-demo-button" aria-pressed={!testing} onClick={() => setTesting(false)}>{text.implementation}</button>
        <button type="button" className="engineer-demo-button" aria-pressed={testing} onClick={() => setTesting(true)}>{text.test}</button>
      </fieldset>
      <pre className="engineer-demo-code"><code>{testing ? testSnippet(text) : implementationSnippet(removeLimit, text)}</code></pre>
      <div className="engineer-demo-detail engineer-quality-run">
        <output aria-live="polite">{text.quantity} <strong>{quantity}</strong></output>
        <div className="engineer-demo-controls">
          <button type="button" className="engineer-demo-button" onClick={() => setQuantity(updateQuantity)}>{text.add}</button>
          <button type="button" className="engineer-demo-button" onClick={() => setQuantity(initialQuantity)}>{text.reset}</button>
        </div>
        <label className="engineer-demo-check">
          <input type="checkbox" checked={removeLimit} onChange={event => changeLimit(event.currentTarget.checked)} /> {text.regression}
        </label>
        <p>{text.testNote}</p>
        <button type="button" className="engineer-demo-button" onClick={runChecks}>{text.run}</button>
        <div aria-live="polite" aria-atomic="true">
          {results.length > 0 && (
            <ul className="engineer-quality-results">
              {results.map(({ id, expected, actual }) => (
                <li key={id} data-result={actual === expected ? 'pass' : 'fail'}>
                  <strong>{actual === expected ? text.passed : text.failed}</strong> · {text[id]}
                  {actual !== expected && <small>{text.expected} {expected} · {text.actual} {actual}</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
