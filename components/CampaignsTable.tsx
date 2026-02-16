import React, { useState } from 'react';
import { CampaignData } from '../types';
import { Facebook, Chrome, Search, Instagram } from 'lucide-react';

interface Props {
  data: CampaignData[];
}

export const CampaignsTable: React.FC<Props> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data based on search query
  const filteredData = data.filter(row => 
    row.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Take first 10 records of filtered data for display
  const displayData = filteredData.slice(0, 10);

  const getPlatformIcon = (platform: string) => {
    if (platform === 'facebook') return <Facebook size={16} className="text-blue-600" />;
    if (platform === 'instagram') return <Instagram size={16} className="text-pink-600" />;
    return <Chrome size={16} className="text-green-600" />;
  };

  const getPlatformStyle = (platform: string) => {
    if (platform === 'facebook') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (platform === 'instagram') return 'bg-pink-50 text-pink-700 border-pink-100';
    return 'bg-green-50 text-green-700 border-green-100';
  };

  const getPlatformName = (platform: string) => {
      if (platform === 'facebook') return 'Meta (FB)';
      if (platform === 'instagram') return 'Instagram';
      if (platform === 'audience_network') return 'Audience Net';
      return 'Google';
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/5 border border-slate-100 overflow-hidden">
      {/* Search Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/30 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Campanha</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Conta</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Plataforma</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Investimento</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Impr.</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Leads</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">CPL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayData.length > 0 ? (
              displayData.map((row) => {
                // Use Backend CPL
                const cpl = row.cpl_total || (row.leads_total > 0 ? row.valor_gasto / row.leads_total : 0);
                
                return (
                  <tr key={row.unique_id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{row.campaign_name}</span>
                        <span className="text-xs text-slate-400">{row.date_start}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">{row.account_name}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getPlatformStyle(row.target_plataformas)}`}>
                        {getPlatformIcon(row.target_plataformas)}
                        {getPlatformName(row.target_plataformas)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-800 text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor_gasto)}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 text-right">
                      {row.impressoes.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-orange-600 text-right">
                      {row.leads_total}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 text-right font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cpl)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                  Nenhuma campanha encontrada para "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="py-3 px-6 border-t border-slate-100 bg-slate-50/30 flex justify-center">
        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
          Ver Todas Transações
        </button>
      </div>
    </div>
  );
};