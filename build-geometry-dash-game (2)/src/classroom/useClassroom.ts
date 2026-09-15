import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Net, Msg, Command, StudentState, NetStatus, Role,
  readRole, readSeat, readRelay, saveIdentity,
} from './net';

export interface ClassroomHandlers {
  onGoto: (screen: 'menu' | 'lab' | 'teachers') => void;
  onPushLevel: (code: string) => void;
  onLock: (on: boolean, text: string) => void;
  onMessage: (text: string) => void;
  onSpotlight: (code: string, from: number) => void;
  onClearSpotlight: () => void;
}

export interface SelfReport {
  screen: string;
  levelName: string;
  pct: number;
  best: number;
  attempts: number;
  pieces: number;
  code: string;
  locked: boolean;
}

export function useClassroom(handlers: ClassroomHandlers, report: SelfReport) {
  const [role, setRole] = useState<Role>(() => readRole());
  const [seat, setSeat] = useState<number>(() => readSeat());
  const [status, setStatus] = useState<NetStatus>('local');
  const [relay, setRelayState] = useState<string>(() => readRelay());
  const [students, setStudents] = useState<Map<number, StudentState>>(new Map());

  const netRef = useRef<Net | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const reportRef = useRef(report);
  reportRef.current = report;
  const roleRef = useRef(role);
  roleRef.current = role;
  const seatRef = useRef(seat);
  seatRef.current = seat;

  // ---- connect ----
  useEffect(() => {
    if (!role) return;
    const net = new Net(readRelay());
    netRef.current = net;
    net.onStatus = setStatus;
    net.onMessage = (m: Msg) => {
      if (m.t === 'state' && roleRef.current === 'teacher') {
        setStudents((prev) => {
          const next = new Map(prev);
          next.set(m.s.seat, m.s);
          return next;
        });
      } else if (m.t === 'who' && roleRef.current === 'student') {
        pushState();
      } else if (m.t === 'cmd' && roleRef.current === 'student') {
        if (m.target !== 'all' && m.target !== seatRef.current) return;
        const h = handlersRef.current;
        const cmd = m.cmd;
        switch (cmd.c) {
          case 'lock': h.onLock(cmd.on, cmd.text || 'Look at the board, please!'); break;
          case 'goto': h.onGoto(cmd.screen); break;
          case 'message': h.onMessage(cmd.text); break;
          case 'pushLevel': h.onPushLevel(cmd.code); break;
          case 'spotlight': h.onSpotlight(cmd.code, cmd.from); break;
          case 'clearSpotlight': h.onClearSpotlight(); break;
          case 'collect': pushState(); break;
        }
      }
    };
    if (role === 'teacher') net.send({ t: 'who' });
    else net.send({ t: 'hello', seat: seatRef.current });
    return () => { net.destroy(); netRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ---- student heartbeat ----
  const pushState = useCallback(() => {
    if (roleRef.current !== 'student' || !netRef.current) return;
    const r = reportRef.current;
    const s: StudentState = { seat: seatRef.current, ...r, ts: Date.now() };
    netRef.current.send({ t: 'state', s });
  }, []);

  useEffect(() => {
    if (role !== 'student') return;
    pushState();
    const id = window.setInterval(pushState, 2000);
    return () => clearInterval(id);
  }, [role, pushState]);

  // push immediately when anything meaningful changes
  useEffect(() => {
    if (role === 'student') pushState();
  }, [role, pushState, report.screen, report.pieces, report.locked, report.best]);

  // ---- teacher prune ----
  useEffect(() => {
    if (role !== 'teacher') return;
    const id = window.setInterval(() => setStudents((m) => new Map(m)), 3000);
    return () => clearInterval(id);
  }, [role]);

  const sendCmd = useCallback((target: number | 'all', cmd: Command) => {
    netRef.current?.send({ t: 'cmd', target, cmd });
  }, []);

  const choose = useCallback((r: 'student' | 'teacher', s: number) => {
    saveIdentity(r, s);
    setSeat(s);
    setRole(r);
  }, []);

  const setRelay = useCallback((url: string) => {
    setRelayState(url);
    netRef.current?.setRelay(url);
  }, []);

  return { role, seat, status, relay, students, sendCmd, choose, setRelay };
}
