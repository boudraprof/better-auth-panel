import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '#/utils/auth'

export const getServerSession = async (headers?: Headers) => {
  const reqHeaders = headers ?? getRequestHeaders()
  return await auth.api.getSession({ headers: reqHeaders })
}
