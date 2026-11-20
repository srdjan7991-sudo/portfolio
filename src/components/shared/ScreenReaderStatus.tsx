export function ScreenReaderStatus({ message }: { message: string }) {
  return <output className="visually-hidden">{message}</output>
}
