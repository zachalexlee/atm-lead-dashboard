'use client';

import { useState, useEffect } from 'react';

interface Lead {
  id: number;
  business_name: string | null;
  address: string | null;
  city: string | null;
  business_type: string | null;
  tier: string | null;
  description: string | null;
  valuation: number | null;
  score: number;
  date_found: string;
  jurisdiction: string | null;
  matched_keywords: string | null;
  phone: string | null;
  owner_name: string | null;
  lead_status: string;
}

interface Stats {
  total: number;
  tier1: number;
  last7Days: number;
  avgScore: number;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, tier1: 0, last7Days: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState('');
  const [filterDays, setFilterDays] = useState('30');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    loadData();
    setLastUpdated(new Date().toLocaleString());
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLeads();
  }, [filterTier, filterDays, searchTerm]);

  const loadData = async () => {
    await Promise.all([loadLeads(), loadStats()]);
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTier) params.append('tier', filterTier);
      if (filterDays) params.append('days', filterDays);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/leads?${params}`);
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Business Name', 'Address', 'City', 'Type', 'Tier', 'Score', 'Valuation', 'Phone', 'Owner', 'Date Found'];
    const rows = leads.map(lead => [
      lead.business_name || '',
      lead.address || '',
      lead.city || '',
      lead.business_type || '',
      lead.tier || '',
      lead.score,
      lead.valuation || '',
      lead.phone || '',
      lead.owner_name || '',
      lead.date_found
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atm-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                🏧 ATM Lead Dashboard
              </h1>
              <p className="text-white/70">
                Auto-updates daily at 5:30 AM PST • Last updated: {lastUpdated}
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
            >
              📥 Export CSV
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-white/70">Total Leads</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-red-400">{stats.tier1}</div>
              <div className="text-sm text-white/70">Tier 1 (High Priority)</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-green-400">{stats.last7Days}</div>
              <div className="text-sm text-white/70">New (Last 7 Days)</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-yellow-400">{stats.avgScore}</div>
              <div className="text-sm text-white/70">Avg Priority Score</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Business name, address..."
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Priority Tier</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Tiers</option>
                <option value="TIER_1">Tier 1 (High)</option>
                <option value="TIER_2">Tier 2 (Medium)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Time Range</label>
              <select
                value={filterDays}
                onChange={(e) => setFilterDays(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400 mb-4"></div>
            <p className="text-xl text-white">Loading leads...</p>
          </div>
        )}

        {/* Leads Table */}
        {!loading && leads.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Business</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tier</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Valuation</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Found</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-4">
                        <div className="text-2xl font-bold text-yellow-400">{lead.score}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-white font-semibold">{lead.business_name || 'N/A'}</div>
                        <div className="text-sm text-white/60">{lead.jurisdiction}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-white">{lead.address}</div>
                        <div className="text-sm text-white/60">{lead.city}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-white">{lead.business_type || 'Unknown'}</div>
                        {lead.matched_keywords && (
                          <div className="text-xs text-white/50 mt-1">{lead.matched_keywords}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          lead.tier === 'TIER_1' 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {lead.tier || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white">
                        {lead.valuation ? `$${lead.valuation.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-white/70 text-sm">
                        {new Date(lead.date_found).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && leads.length === 0 && (
          <div className="text-center py-20 bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-white mb-2">No leads found</h3>
            <p className="text-white/70">Try adjusting your filters or check back after the next update</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-white/50 text-sm">
          <p>Forza ATM Lead Generation System • Built for Zach & Team</p>
          <p className="mt-1">Automated daily updates at 5:30 AM PST</p>
        </div>
      </div>
    </div>
  );
}
