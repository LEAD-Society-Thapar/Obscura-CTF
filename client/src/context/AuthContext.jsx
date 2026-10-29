import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMe, teamLogin, teamLogout } from "../api/endpoints.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getMe();
      setTeam(data.team);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (teamCode) => {
    const data = await teamLogin(teamCode);
    setTeam(data.team);
    return data.team;
  };

  const logout = async () => {
    await teamLogout();
    setTeam(null);
  };

  return (
    <AuthContext.Provider value={{ team, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
