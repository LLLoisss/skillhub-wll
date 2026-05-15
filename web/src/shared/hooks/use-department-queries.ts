import { useQuery } from '@tanstack/react-query'
import type { Department, UserProfileByEmail } from '@/api/types'
import { departmentApi } from '@/api/client'

async function getAllDepartments(): Promise<Department[]> {
  const result = await departmentApi.listAll()
  return result
  // return  [{ id: 1001, name: '软件开发中心', level: 1, children: [{ id: 10011, name: '软件开发团队（合肥）', level: 2, children: [] }] }, { id: 1002, name: '软件开发中心', level: 1, children: [{ id: 10011, name: '软件开发团队（西安）', level: 2, children: [] }] }]
}

async function getDepartmentsByEmail(email: string): Promise<Department[]> {
  const result = await departmentApi.listByEmail(email)
  return result
}

async function getUserProfileByEmail(email: string): Promise<UserProfileByEmail> {
  const result = await departmentApi.getUserProfileByEmail(email)
  return result
  // return {
  //   name: "汪璐璐",
  //   departments: [{ id: 1001, name: '软件开发中心', level: 1, children: [{ id: 10011, name: '软件开发团队（合肥）', level: 2, children: [] }] }, { id: 1002, name: '安徽省分行', level: 1, children: [{ id: 100122, name: '软件开发团队', level: 2, children: [] }] }]
  // }
}

export function useAllDepartments() {
  return useQuery({
    queryKey: ['departments','all'],
    queryFn: () => getAllDepartments(),
  })
}

export function useDepartmentsByEmail(email: string | undefined) {
  return useQuery({
    queryKey: ['departments', email],
    queryFn: () => getDepartmentsByEmail(email!),
    enabled: !!email,
  })
}

export function useUserProfileByEmail(email: string | undefined) {
  return useQuery<UserProfileByEmail>({
    queryKey: ['userProfile', 'byEmail', email],
    queryFn: () => getUserProfileByEmail(email!),
    enabled: !!email,
  })
}