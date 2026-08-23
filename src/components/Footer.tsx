import { APP_NAME } from '#/utils/app-name'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t px-4 py-3 text-muted-foreground">
      <div className="flex items-center justify-between text-xs">
        <p>&copy; {year} {APP_NAME}</p>
      </div>
    </footer>
  )
}
