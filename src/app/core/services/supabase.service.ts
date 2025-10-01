import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type Topic = 'Ibuprofen' | 'COVID-19' | 'Paracetamol';

export interface Mention {
  id: number;
  Title?: string;
  Detail?: string;
  Link?: string;
  Source?: string;
  'Update date'?: string;
  'Publish date'?: string;
  Sentiment?: string;
  Ranking?: number;
  'Media type'?: string;
  Tags?: string;
  Country?: string;
  Language?: string;
  Audience?: string;
  Reach?: number;
  Interactions?: string;
  Notes?: string;
  'Author name'?: string;
  'Author handle (@username)'?: string;
  'Author URL'?: string;
  Gender?: string;
  Age?: string;
  Bio?: string;
  City?: string;
  Classification?: string;
  Processed?: boolean;
  Justification?: string;
  Resolved?: boolean;
}

type SortDir = 'asc' | 'desc';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  dbname: string = environment.dbName;

  private clientPromise: Promise<any> | null = null;
  private getClient() {
    if (!this.clientPromise) {
      this.clientPromise = import('@supabase/supabase-js').then(mod =>
        mod.createClient(environment.supabaseUrl, environment.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
      );
    }
    return this.clientPromise;
  }

  setTopic(topic: Topic) {
    if (topic === 'Ibuprofen') this.dbname = environment.dbNameIbuprofen || environment.dbName || this.dbname;
    else if (topic === 'COVID-19') this.dbname = environment.dbNameCovid || environment.dbName || this.dbname;
    else if (topic === 'Paracetamol') this.dbname = environment.dbNameParacetamol || environment.dbName || this.dbname;
  }

  async getMentionCount(): Promise<{ count: number | null; error: any }> {
    const supabase = await this.getClient();
    return await supabase.from(this.dbname).select('*', { count: 'exact', head: true });
  }

  async getMentionsPaged(from: number, to: number): Promise<{ data: Mention[] | null; error: any }> {
    const supabase = await this.getClient();
    return await supabase.from(this.dbname).select('*').order('id', { ascending: true }).range(from, to);
  }

  async getMentions(): Promise<Mention[]> {
    try {
      const supabase = await this.getClient();
      const { data } = await supabase.from(this.dbname).select('*').order('id', { ascending: true });
      return (data as Mention[]) || [];
    } catch {
      return [];
    }
  }

  async getMentionById(id: number): Promise<Mention | null> {
    const supabase = await this.getClient();
    const { data } = await supabase.from(this.dbname).select('*').eq('id', id).single();
    return (data as Mention) || null;
  }

  async updateMention(id: number, updatedFields: Partial<Mention>): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase.from(this.dbname).update(updatedFields).eq('id', id);
    return !error;
  }

  async createMention(mention: Partial<Mention>): Promise<Mention | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.from(this.dbname).insert([mention]).select().single();
    if (error) return null;
    return data || null;
  }

  async deleteMention(id: number): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase.from(this.dbname).delete().eq('id', id);
    return !error;
  }

  async getNextMentionId(): Promise<number> {
    const supabase = await this.getClient();
    const { data } = await supabase.from(this.dbname).select('id').order('id', { ascending: false }).limit(1);
    if (!data || data.length === 0) return 1;
    return Number((data[0] as any).id) + 1;
  }

  private quoteIfNeeded(column: string) {
    return /[^a-z0-9_]/i.test(column) && !/^".*"$/.test(column) ? `"${column}"` : column;
  }

  private normalizeBool(v: any): boolean | null {
    if (v === true || v === false) return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return null;
  }

  private applyFiltersV2(query: any, f: any): any {
    if (typeof f.baseProcessed === 'boolean') query = query.eq('Processed', f.baseProcessed);
    if (f.mediaType) query = query.eq('Media type', f.mediaType);
    if (f.classification) query = query.eq('Classification', f.classification);
    if (f.classificationNot) query = query.neq('Classification', f.classificationNot);
    if (f.resolvedNullOrFalse) query = query.or('Resolved.is.null,Resolved.eq.false');

    const resolved = this.normalizeBool(f.resolved);
    if (resolved !== null) query = query.eq('Resolved', resolved);

    const tagTerm: string = (f.tagTerm ?? '').toString().trim();
    if (tagTerm !== '') {
      const safe: string = tagTerm.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
      const pattern: string = `%${safe}%`;
      query = query.ilike('Tags', pattern);
    }

    const titleTerm: string = (f.titleTerm ?? '').toString().trim();
    if (titleTerm !== '') {
      const safe: string = titleTerm.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
      const pattern: string = `%${safe}%`;
      query = query.ilike('Detail', pattern);
    }

    return query;
  }

  async getMentionsFilteredV2(
    from: number,
    to: number,
    filters: any,
    sortColumn: string,
    sortDirection: SortDir
  ): Promise<{ data: Mention[] | null; error: any }> {
    const supabase = await this.getClient();
    let query = supabase.from(this.dbname).select('*', { count: 'exact' }).range(from, to);
    query = this.applyFiltersV2(query, filters);
    const allowed = new Set(['id','Publish date','Media type','Classification','Processed','Resolved']);
    if (sortColumn && allowed.has(sortColumn)) {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc', nullsFirst: false });
    } else {
      query = query.order('id', { ascending: true });
    }
    const { data, error } = await query;
    return { data, error };
  }

  async getFilteredCountV2(filters: any): Promise<{ count: number; error: any }> {
    const supabase = await this.getClient();
    let query = supabase.from(this.dbname).select('*', { count: 'exact', head: true });
    query = this.applyFiltersV2(query, filters);
    const { count, error } = await query;
    return { count: count ?? 0, error };
  }

  private async distinctValues(column: string): Promise<string[]> {
    const supabase = await this.getClient();
    const selectCol = this.quoteIfNeeded(column);
    const { data, error } = await supabase.from(this.dbname).select(selectCol).not(column, 'is', null).order(column, { ascending: true });
    if (error) return [];
    const vals = ((data as Record<string, string | null>[] | null) ?? []).map(r => r[column] ?? null).filter((v: string | null): v is string => v !== null);
    return Array.from(new Set(vals));
  }

  private async headCountEq(column: string, value: any): Promise<number> {
    const supabase = await this.getClient();
    const { count } = await supabase.from(this.dbname).select('id', { count: 'exact', head: true }).eq(column, value);
    return count ?? 0;
  }

  async getCountsByMediaType(): Promise<{ name: string; y: number }[]> {
    const values: string[] = await this.distinctValues('Media type');
    const pairs = await Promise.all(values.map(async v => ({ name: v || 'N/A', y: await this.headCountEq('Media type', v) })));
    return pairs.sort((a, b) => b.y - a.y);
  }

  async getCountsByClassification(): Promise<{ name: string; y: number }[]> {
    const values: string[] = await this.distinctValues('Classification');
    const pairs = await Promise.all(values.map(async v => ({ name: v || 'N/A', y: await this.headCountEq('Classification', v) })));
    return pairs.sort((a, b) => b.y - a.y);
  }

  async getProcessedAndTotal(): Promise<{ total: number; processed: number }> {
    const supabase = await this.getClient();
    const [totalRes, processedRes] = await Promise.all([
      supabase.from(this.dbname).select('id', { count: 'exact', head: true }),
      supabase.from(this.dbname).select('id', { count: 'exact', head: true }).eq('Processed', true)
    ]);
    const total = totalRes.count ?? 0;
    const processed = processedRes.count ?? 0;
    return { total, processed: Math.min(processed, total) };
  }

  async getProcessedBreakdown(): Promise<{ name: string; y: number }[]> {
    const { total, processed } = await this.getProcessedAndTotal();
    const rest = Math.max(total - processed, 0);
    return [{ name: 'Processed', y: processed },{ name: 'Not processed', y: rest }];
  }

  async getAllPublishDates(): Promise<string[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.from(this.dbname).select('"Publish date"').not('Publish date', 'is', null).order('Publish date', { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => r['Publish date']).filter(Boolean);
  }

  async setResolved(id: number, value: boolean): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase.from(this.dbname).update({ Resolved: value }).eq('id', id);
    return !error;
  }

  async getResolvedAndTotal(): Promise<{ total: number; resolved: number }> {
    const supabase = await this.getClient();
    const [totalRes, resolvedRes] = await Promise.all([
      supabase.from(this.dbname).select('id', { count: 'exact', head: true }),
      supabase.from(this.dbname).select('id', { count: 'exact', head: true }).eq('Resolved', true)
    ]);
    const total = totalRes.count ?? 0;
    const resolved = resolvedRes.count ?? 0;
    return { total, resolved: Math.min(resolved, total) };
  }

  async getProcessedApplicableBreakdown(): Promise<{ name: string; y: number }[]> {
    const supabase = await this.getClient();
    const [naRes, applicableRes] = await Promise.all([
      supabase.from(this.dbname).select('id', { count: 'exact', head: true }).eq('Processed', true).eq('Classification', 'Not applicable'),
      supabase.from(this.dbname).select('id', { count: 'exact', head: true }).eq('Processed', true).not('Classification', 'is', null).neq('Classification', 'Not applicable')
    ]);
    const na = naRes.count ?? 0;
    const applicable = applicableRes.count ?? 0;
    return [
      { name: 'Applicable', y: applicable },
      { name: 'Not applicable', y: na }
    ];
  }
}
