import { useQuery } from '@tanstack/react-query'
import type { Department } from '@/api/types'
import { departmentApi } from '@/api/client'

async function getAllDepartments(): Promise<Department[]> {
  const result = await departmentApi.listAll()
  if(result.length === 0) {
    return [{id: 1001, department: '其他部门'}]
  }
  return result
}

async function getDepartmentsByEmail(email: string): Promise<Department[]> {
  const result = await departmentApi.listByEmail(email)
  if(result.length === 0) {
    return [{id: 1001, department: '其他部门'}]
  }
  return result
}

export function useAllDepartments() {
  return useQuery<Department[]>({
    queryKey: ['departments', 'all'],
    queryFn: () => getAllDepartments(),
  })
}

export function useDepartmentsByEmail(email: string | undefined) {
  return useQuery<Department[]>({
    queryKey: ['departments', email],
    queryFn: () => getDepartmentsByEmail(email!),
    enabled: !!email,
  })
}
