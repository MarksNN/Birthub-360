import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

export function SwarmObservability() {
  const [agents, setAgents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, logsRes] = (await Promise.all([
          api.get('/api/intelligence/observability/agents'),
          api.get('/api/intelligence/observability/logs'),
        ])) as any[];
        setAgents(agentsRes.data?.data || []);
        setLogs(logsRes.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch swarm observability data', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Swarm Observability</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Active Agents</h3>
          {agents.length === 0 ? (
            <p className="text-sm opacity-60">No active agents</p>
          ) : (
            <ul className="text-sm space-y-1">
              {agents.map((a) => (
                <li key={a.id}>
                  {a.name} - {a.status}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Recent Logs</h3>
          {logs.length === 0 ? (
            <p className="text-sm opacity-60">No recent logs</p>
          ) : (
            <ul className="text-sm space-y-1">
              {logs.map((l) => (
                <li key={l.id}>
                  {l.timestamp} - {l.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
