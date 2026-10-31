import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMe, teamLogin, teamLogout } from "../api/endpoints.js";
import { USE_MOCKS } from "../lib/config.js";
import { resetMock } from "../data/mockApi.js";

const AuthContext = createContext(null);

// Mock mode: any non-empty Team ID + password logs in; the session survives a reload via sessionStorage.
const MOCK_SESSION_KEY = "obscura_mock_team";

function readMockSession() {
  try {
    return JSON.parse(sessionStorage.getItem(MOCK_SESSION_KEY));
  } catch {
    return null;
  }
}

function writeMockSession(team) {
  try {
    if (team) sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(team));
    else sessionStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    /* storage blocked: session just won't survive a reload */
  }
}

export function AuthProvider({ children }) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (USE_MOCKS) {
      setTeam(readMockSession());
      setLoading(false);
      return;
    }
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

  const login = async (teamId, password) => {
    if (USE_MOCKS) {
      if (!teamId || !password) throw new Error("Enter your Team ID and password.");
      const mockTeam = { id: teamId, name: teamId };
      writeMockSession(mockTeam);
      setTeam(mockTeam);
      return mockTeam;
    }
    // TODO(auth): the UI collects Team ID + Password, but the server only accepts a team code today.
    // The Team ID is sent as the team code and the password is dropped until the backend supports it.
    const data = await teamLogin(teamId);
    setTeam(data.team);
    return data.team;
  };

  const logout = async () => {
    if (USE_MOCKS) {
      writeMockSession(null);
      resetMock(); // next login starts from the initial mock state
      setTeam(null);
      return;
    }
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
