import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { API } from './config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filiais, setFiliais] = useState([])
  const [selectedFilial, setSelectedFilialState] = useState(
    () => localStorage.getItem('frota_filial_filter') || ''
  )

  const setSelectedFilial = (val) => {
    setSelectedFilialState(val)
    if (val) localStorage.setItem('frota_filial_filter', val)
    else localStorage.removeItem('frota_filial_filter')
  }

  useEffect(() => {
    const token = localStorage.getItem('frota_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      axios.get(`${API}/auth/me`)
        .then(r => setUser(r.data))
        .catch(() => {
          localStorage.removeItem('frota_token')
          delete axios.defaults.headers.common['Authorization']
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    if (user.perfil === 'admin' || user.perfil === 'gerencial') {
      axios.get(`${API}/auth/filiais`).then(r => setFiliais(r.data || [])).catch(() => {})
    }
  }, [user])

  const login = async (username, password) => {
    const res = await axios.post(`${API}/auth/login`, { username, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('frota_token', access_token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('frota_token')
    localStorage.removeItem('frota_filial_filter')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setFiliais([])
    setSelectedFilialState('')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, filiais, selectedFilial, setSelectedFilial }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
