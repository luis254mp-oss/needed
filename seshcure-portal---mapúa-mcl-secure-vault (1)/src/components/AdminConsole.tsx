import React, { useState } from 'react';
import { User, SessionAuditLog, SharedLink, EncryptedFileItem } from '../types';
import { 
  ShieldAlert, Globe, MapPin, AlertOctagon, CheckCircle2, 
  Ban, RefreshCw, Radio, UserX, Link2Off, Activity, ShieldCheck
} from 'lucide-react';

interface AdminConsoleProps {
  currentUser: User;
  auditLogs: SessionAuditLog[];
  sharedLinks: SharedLink[];
  files: EncryptedFileItem[];
  onRevokeLink: (linkId: string) => void;
  onRevokeFile: (fileId: string) => void;
  onAddAuditLog: (log: SessionAuditLog) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentUser,
  auditLogs,
  sharedLinks,
  files,
  onRevokeLink,
  onRevokeFile,
  onAddAuditLog
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'CAMPUS' | 'EXTERNAL' | 'ALERT'>('ALL');
  const [revokedSessions, setRevokedSessions] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  const filteredLogs = auditLogs.filter(log => {
    if (filterType === 'CAMPUS') return log.isCampusSubnet;
    if (filterType === 'EXTERNAL') return !log.isCampusSubnet;
    if (filterType === 'ALERT') return log.status === 'REJECTED' || log.riskScore > 50;
    return true;
  });

  const handleRevokeSession = (log: SessionAuditLog) => {
    if (confirm(`Immediately terminate and blacklist active session for ${log.userEmail} from IP ${log.ipAddress}?`)) {
      setRevokedSessions(prev => [...prev, log.id]);
      
      onAddAuditLog({
        id: `log-rev-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: currentUser.email,
        userName: currentUser.name,
        action: `ADMIN_FORCE_REVOKE_SESSION_${log.userEmail}`,
        ipAddress: '10.10.42.105',
        city: 'Cabuyao City',
        region: 'Laguna',
        country: 'Philippines',
        isp: 'MCL IT Security Directorate',
        isCampusSubnet: true,
        status: 'WARNING',
        riskScore: 0
      });
      alert(`Session token for ${log.userEmail} has been invalidated across all campus nodes.`);
    }
  };

  const handleSimulateAttack = () => {
    setSimulating(true);
    setTimeout(() => {
      const suspiciousLog: SessionAuditLog = {
        id: `log-att-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: 'payongluismiguel649@gmail.com',
        userName: 'Unauthorized External User',
        action: 'LOGIN_GATE_DOMAIN_REJECTION',
        ipAddress: '198.51.100.89',
        city: 'Singapore',
        region: 'Central Region',
        country: 'Singapore',
        isp: 'DigitalOcean Cloud Proxy',
        isCampusSubnet: false,
        status: 'REJECTED',
        riskScore: 94
      };
      onAddAuditLog(suspiciousLog);
      setSimulating(false);
    }, 600);
  };

  const handleSimulateCampusAccess = () => {
    setSimulating(true);
    setTimeout(() => {
      const campusLog: SessionAuditLog = {
        id: `log-camp-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: 'esantos@mcl.edu.ph',
        userName: 'Prof. Enrico Santos',
        action: 'CAMPUS_LAN_AES256_SYNC',
        ipAddress: '172.16.88.45',
        city: 'Cabuyao City',
        region: 'Laguna (CALABARZON)',
        country: 'Philippines',
        isp: 'Mapúa MCL MITL Lab 402 Network',
        isCampusSubnet: true,
        status: 'SUCCESS',
        riskScore: 1
      };
      onAddAuditLog(campusLog);
      setSimulating(false);
    }, 500);
  };

  const campusSubnetCount = auditLogs.filter(l => l.isCampusSubnet).length;
  const externalSubnetCount = auditLogs.filter(l => !l.isCampusSubnet).length;
  const threatCount = auditLogs.filter(l => l.status === 'REJECTED' || l.riskScore > 50).length;

  return (
    <div className="space-y-6">

      {/* Admin Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-white tracking-tight">Cybersecurity Directorate Console</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time IP Geolocation Session Monitoring & Emergency Revocation Controls for Mapúa MCL
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateAttack}
            disabled={simulating}
            className="py-1.5 px-3 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-xs transition flex items-center gap-1.5"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Simulate Non-MCL Intrusion</span>
          </button>

          <button
            onClick={handleSimulateCampusAccess}
            disabled={simulating}
            className="py-1.5 px-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded text-xs transition flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Simulate Campus LAN Event</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Campus Subnet Verified Logins</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">{campusSubnetCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">10.10.x.x / 172.16.x.x (Cabuyao LAN)</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">External / Residential Connections</div>
          <div className="text-2xl font-bold text-slate-200 mt-1 font-mono tabular-nums">{externalSubnetCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Santa Rosa, Calamba, Manila, etc.</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Rejected Domain Attempts</div>
          <div className="text-2xl font-bold text-rose-400 mt-1 font-mono tabular-nums">{threatCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Non-MCL domains (@gmail.com) blocked</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Active Shared Vault Links</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            {sharedLinks.filter(l => !l.isRevoked).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Killswitch ready</div>
        </div>
      </div>

      {/* Campus Subnet & Geolocation Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-white">Mapúa MCL Campus Geolocation Center</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Latitude: 14.2483° N · Longitude: 121.1302° E · Cabuyao, Laguna
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Visual Subnet Cluster Diagram */}
          <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-lg p-4 relative overflow-hidden min-h-[220px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-white">Campus Perimeter: Pulo-Diezmo Road Complex</span>
              <span className="font-mono text-[11px] text-emerald-400">LAN Firewalls: Active (Strict IPS)</span>
            </div>

            {/* Simulated Nodes Representation */}
            <div className="grid grid-cols-3 gap-3 my-2">
              <div className="p-3 bg-slate-900/90 border border-emerald-500/50 rounded-lg">
                <div className="text-[11px] font-bold text-emerald-400">MCL Building 1 (Admin/CCIS)</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">10.10.18.0/24 Subnet</div>
                <div className="text-[10px] text-slate-500 mt-1">4 Active Encrypted Sessions</div>
              </div>

              <div className="p-3 bg-slate-900/90 border border-emerald-500/50 rounded-lg">
                <div className="text-[11px] font-bold text-emerald-400">MITL Engineering Wing</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">172.16.88.0/24 Subnet</div>
                <div className="text-[10px] text-slate-500 mt-1">2 Active Faculty Nodes</div>
              </div>

              <div className="p-3 bg-slate-900/90 border border-rose-500/50 rounded-lg">
                <div className="text-[11px] font-bold text-rose-400">External Perimeter Gateway</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Public WAN Inbound</div>
                <div className="text-[10px] text-slate-500 mt-1">Domain & PIN Authenticated</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-900 pt-2 font-mono">
              <span>Primary ISP: PLDT Enterprise Dedicated Leased Line</span>
              <span>Secondary: Globe Telecom Dark Fiber</span>
            </div>
          </div>

          {/* Quick Subnet Security Rules */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
            <div className="font-semibold text-slate-200">Session Gate Policy:</div>
            <ul className="space-y-2 text-slate-400 text-[11px]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-200">Campus Subnets:</strong> Direct decrypt permissions with standard JWT tokens.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-200">Off-Campus IP:</strong> Mandatory 2-hour link expiry and optional PIN challenge.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-200">Non-MCL Domain:</strong> Immediate firewall drop & audit trail entry.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filter Tabs for Logs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded transition-colors ${filterType === 'ALL' ? 'bg-rose-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All Logs ({auditLogs.length})
          </button>
          <button
            onClick={() => setFilterType('CAMPUS')}
            className={`px-3 py-1 rounded transition-colors ${filterType === 'CAMPUS' ? 'bg-rose-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Campus Subnet ({campusSubnetCount})
          </button>
          <button
            onClick={() => setFilterType('EXTERNAL')}
            className={`px-3 py-1 rounded transition-colors ${filterType === 'EXTERNAL' ? 'bg-rose-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
          >
            External Networks ({externalSubnetCount})
          </button>
          <button
            onClick={() => setFilterType('ALERT')}
            className={`px-3 py-1 rounded transition-colors ${filterType === 'ALERT' ? 'bg-rose-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Rejections & Alerts ({threatCount})
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Auto-Refreshing Live Session Telemetry
        </div>
      </div>

      {/* Live Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-200">Live Session Geolocation & Transfer Ledger</div>
          <div className="text-[11px] text-slate-500 font-mono">Status: Green = MCL Subnet · Red = External / Alert</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">User Email</th>
                <th className="py-2.5 px-4">Event Action</th>
                <th className="py-2.5 px-4">Client IP</th>
                <th className="py-2.5 px-4">Geolocation (City, Region)</th>
                <th className="py-2.5 px-4">Network Subnet</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Revocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredLogs.map(log => {
                const isRevoked = revokedSessions.includes(log.id);
                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-mono text-slate-400 tabular-nums">{log.timestamp}</td>
                    
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-200">{log.userEmail}</div>
                      <div className="text-[10px] text-slate-500 truncate">{log.userName}</div>
                    </td>

                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">
                      {log.action}
                    </td>

                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {log.ipAddress}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="text-slate-200">{log.city}, {log.region}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{log.isp}</div>
                    </td>

                    <td className="py-2.5 px-4 font-mono">
                      {log.isCampusSubnet ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Campus Subnet
                        </span>
                      ) : (
                        <span className="text-rose-400 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          External Net
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 font-mono font-medium">
                      {log.status === 'SUCCESS' ? (
                        <span className="text-emerald-400">SUCCESS</span>
                      ) : log.status === 'REJECTED' ? (
                        <span className="text-rose-400">REJECTED</span>
                      ) : (
                        <span className="text-amber-400">WARNING</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      {isRevoked ? (
                        <span className="text-rose-400 font-mono text-[10px] bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                          REVOKED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRevokeSession(log)}
                          className="py-1 px-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800 border border-transparent rounded text-[11px] transition inline-flex items-center gap-1"
                          title="Terminate active JWT session immediately"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Links Revocation Control Board */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white">Emergency Tokenized Link Killswitch</h3>
            <p className="text-[11px] text-slate-400">Revoke active shared download links campus-wide with one click.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                <th className="py-2.5 px-4">Link ID</th>
                <th className="py-2.5 px-4">Document</th>
                <th className="py-2.5 px-4">Created By</th>
                <th className="py-2.5 px-4">Expires At</th>
                <th className="py-2.5 px-4">Downloads</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Emergency Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {sharedLinks.map(link => (
                <tr key={link.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-4 font-mono text-slate-400">/s/{link.token}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-200">{link.fileName}</td>
                  <td className="py-2.5 px-4 text-slate-400">{link.createdByEmail}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">{link.expiresAt}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums">{link.downloadCount} / {link.maxDownloads}</td>
                  <td className="py-2.5 px-4 font-mono">
                    {link.isRevoked ? (
                      <span className="text-rose-400 font-semibold">TERMINATED</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">ACTIVE</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {!link.isRevoked ? (
                      <button
                        onClick={() => {
                          if (confirm(`Revoke link for ${link.fileName}? All further downloads will be blocked.`)) {
                            onRevokeLink(link.id);
                          }
                        }}
                        className="py-1 px-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-xs transition inline-flex items-center gap-1"
                      >
                        <Link2Off className="w-3 h-3" />
                        <span>Revoke Link</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px] font-mono">Disabled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
