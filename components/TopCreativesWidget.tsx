import React, { useMemo } from 'react';
import { CampaignData } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, ImageIcon, Trophy, Image as LucideImage } from 'lucide-react';
import { SafeImage } from './ui/SafeImage';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle
} from "@/components/ui/dialog";

import { TopCreative } from '../hooks/useDashboardMetrics';

interface Props {
  data: CampaignData[];
  topCreatives?: TopCreative[];
}

interface AdDetailedPerformance {
    id: string;
    name: string;
    imageUrl?: string;
    link?: string;
    spend: number;
    leads: number;
    purchases: number;
    impressions: number;
    clicks: number;
    cpl: number;
    cpc: number;
    cpr: number; // Cost Per Result (Smart Logic)
    cpm: number;
    freq: number;
}

export const TopCreativesWidget: React.FC<Props> = ({ data, topCreatives }) => {
  
  /* eslint-disable react-hooks/exhaustive-deps */
  const topAds = useMemo(() => {
    if (topCreatives && topCreatives.length > 0) {
        return topCreatives.map(tc => {
             const clicks = (tc as any).clicks || 0;
             const impressions = (tc as any).impressions || 0;
             // Calculate missing derived metrics if needed
             const cpl = tc.leads > 0 ? tc.investment / tc.leads : 0;
             const cpc = clicks > 0 ? tc.investment / clicks : 0;
             const cpm = impressions > 0 ? (tc.investment / impressions) * 1000 : 0;
             
             return {
                id: tc.ad_id,
                name: tc.ad_name || 'Anúncio',
                imageUrl: (tc as any).imageUrl || '', 
                link: (tc as any).link || '',
                spend: tc.investment,
                leads: tc.leads,
                purchases: tc.purchases,
                impressions,
                clicks,
                cpl,
                cpc,
                cpr: tc.cpr || 0,
                cpm,
                freq: (tc as any).freq || 1,
                // Pass through any other props
             };
        });
    }

    // Aggregation Map
    const adMap = new Map<string, AdDetailedPerformance>();

    data.forEach(row => {
        // Use Image URL or Ad Title as unique identifier fallback, but prefer ID
        const id = String(row.ad_id || row.ad_image_url || row.ad_name || `unknown-${Math.random()}`);
        
        const current = adMap.get(id) || {
            id,
            name: row.ad_title || row.ad_name || 'Anúncio sem título', // Prefer explicit ad_title
            imageUrl: row.ad_image_url,
            // Fallback: Post Link -> Destination URL -> "https://facebook.com/ads/library/?id={ad_id}" (if ad_id exists)
            link: row.ad_post_link || row.ad_destination_url || (row.ad_id ? `https://facebook.com/ads/library/?id=${row.ad_id}` : undefined),
            spend: 0,
            leads: 0,
            purchases: 0,
            impressions: 0,
            clicks: 0,
            cpl: 0,
            cpc: 0,
            cpr: 0,
            cpm: 0,
            freq: 0
        };

        // Sum Metrics
        current.spend += row.valor_gasto || 0;
        current.leads += row.msgs_iniciadas || 0;
        current.purchases += row.compras || 0;
        current.impressions += row.impressoes || 0;
        current.clicks += row.cliques_todos || 0;
        
        // Freq average? Or recalculate based on Reach?
        // Since we don't have aggregated Reach easily here without summing, we can estimate average freq or just use the one from the row if unique.
        // Better: Freq = Impressions / Reach. If Reach is in row, sum it? Reach isn't additive usually.
        // Let's weighted average Freq by Impressions for lack of better reach sum? Or just sum Reach if provided?
        // Let's assume row.alcance exists (from new View). Reach IS additive if we assume distinct audiences per row, but usually not.
        // Safest for "Top Creatives" list (which are likely individual ad rows anyway):
        // If data is granular (daily), we sum impressions and sum spend.
        // For Frequency, it's safer to not sum but re-calc if we have Reach.
        // Let's use (Sum Impressions / Sum Reach) if Reach available, else average freq.
        // Actually, simple average or max is often used if no reach data.
        // Let's sum reach for now as approximation if rows are e.g. different platforms.
        // Wait, 'alcance' IS in CampaignData now.
        // For this widget, let's keep it simple: Impressions / Reach (if reach > 0).
        
        // Storing partial reach sum for calc
        // @ts-ignore - Adding temp prop
        current._tempReach = (current._tempReach || 0) + (row.alcance || 0);

        adMap.set(id, current);
    });

    return Array.from(adMap.values())
        .map(ad => {
            // @ts-ignore
            const reach = ad._tempReach || 0;

            // Calculations
            const cpl = ad.leads > 0 ? ad.spend / ad.leads : 0;
            const cpc = ad.clicks > 0 ? ad.spend / ad.clicks : 0;
            const cpm = ad.impressions > 0 ? (ad.spend / ad.impressions) * 1000 : 0;
            const freq = reach > 0 ? ad.impressions / reach : 0;

            // Smart CPR: If Purchases existing, use Cost/Purchase. Else CPL.
            // If both, prioritizing Purchase as "Result".
            // However, this logic works per row.
            let cpr = 0;
            if (ad.purchases > 0) {
                cpr = ad.spend / ad.purchases;
            } else if (ad.leads > 0) {
                cpr = cpl;
            }

            return {
                ...ad,
                cpl,
                cpc,
                cpm,
                cpr,
                freq: freq || 1 // Fallback
            };
        })
        .sort((a, b) => b.spend - a.spend) // Sort by Spend DESC
        .slice(0, 5); // Take Top 5
  }, [data, topCreatives]);


  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
  const fmtDec = (val: number) => val.toFixed(2).replace('.', ',');

  return (
    <Card className="col-span-1 shadow-sm border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-100/50">
        <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-2 rounded-lg">
                <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <div>
                <CardTitle className="text-base font-bold text-slate-800">Top 5 Criativos</CardTitle>
                <p className="text-xs text-slate-500 font-medium">Melhor performance por investimento</p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-50/80">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[80px] text-center font-bold text-slate-600 text-[11px] uppercase tracking-wider">Preview</TableHead>
                        <TableHead className="min-w-[200px] font-bold text-slate-600 text-[11px] uppercase tracking-wider">Nome</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Invest.</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Leads</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Vendas</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider text-indigo-600">CPR</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">CPL</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">CPC</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">CPM</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Freq</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Impr.</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Cliques</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {topAds.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                                Nenhum dado disponível para o período selecionado.
                            </TableCell>
                        </TableRow>
                    )}
                    {topAds.map((ad) => (
                        <TableRow key={ad.id} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                            {/* Preview */}
                            <TableCell className="text-center py-3">
                                {ad.imageUrl ? (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <div className="relative h-12 w-12 mx-auto cursor-pointer rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:ring-2 hover:ring-indigo-500/20 hover:scale-105 transition-all bg-slate-100">
                                                <SafeImage 
                                                    src={ad.imageUrl} 
                                                    alt={ad.name} 
                                                    fallbackIcon={<LucideImage size={18} className="text-slate-300" />}
                                                />
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-screen-md p-0 bg-transparent border-none shadow-none">
                                            <div className="relative flex flex-col items-center">
                                                <SafeImage 
                                                    src={ad.imageUrl} 
                                                    alt={ad.name} 
                                                    className="max-h-[80vh] w-auto rounded-xl shadow-2xl border-4 border-white"
                                                    containerClassName="h-auto w-auto"
                                                />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                ) : (
                                    <div className="h-12 w-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                                        <ImageIcon size={20} />
                                    </div>
                                )}
                            </TableCell>

                            {/* Name */}
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    {ad.link ? (
                                        <div className="flex items-center gap-2">
                                            <a 
                                                href={ad.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="font-semibold text-sm text-slate-700 hover:text-indigo-600 line-clamp-2 max-w-[200px] leading-snug transition-colors"
                                                title={ad.name}
                                            >
                                                {ad.name}
                                            </a>
                                            <a 
                                                href={ad.link}
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="shrink-0 p-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                                                title="Ver Anúncio"
                                            >
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    ) : (
                                        <span className="font-semibold text-sm text-slate-700 line-clamp-2 max-w-[220px] leading-snug" title={ad.name}>{ad.name}</span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-medium">ID: {ad.id.substring(0,8)}...</span>
                                </div>
                            </TableCell>

                            {/* Metrics */}
                            <TableCell className="text-right font-bold text-slate-700">{fmtCurrency(ad.spend)}</TableCell>
                            <TableCell className="text-right font-medium text-slate-600">{fmtNumber(ad.leads)}</TableCell>
                            <TableCell className="text-right font-medium text-slate-600">{fmtNumber(ad.purchases)}</TableCell>
                            
                            {/* CPR (Highlight) */}
                            <TableCell className="text-right">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${ad.cpr > 0 && ad.cpr < 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                    {fmtCurrency(ad.cpr)}
                                </span>
                            </TableCell>

                            <TableCell className="text-right text-xs text-slate-600">{fmtCurrency(ad.cpl)}</TableCell>
                            <TableCell className="text-right text-xs text-slate-600">{fmtCurrency(ad.cpc)}</TableCell>
                            <TableCell className="text-right text-xs text-slate-600">{fmtCurrency(ad.cpm)}</TableCell>
                            <TableCell className="text-right text-xs text-slate-600">{fmtDec(ad.freq)}</TableCell>
                            <TableCell className="text-right text-xs text-slate-600">{fmtNumber(ad.impressions)}</TableCell>
                            <TableCell className="text-right text-xs text-slate-600">{fmtNumber(ad.clicks)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};
