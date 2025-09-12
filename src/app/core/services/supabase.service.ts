// import { Injectable } from '@angular/core';
// import { environment } from '../../environments/environment';

// export interface Mention {
//   id: number;
//   Title?: string;
//   Detail?: string;
//   Link?: string;
//   Source?: string;
//   'Update date'?: string;
//   'Publish date'?: string;
//   Sentiment?: string;
//   Ranking?: number;
//   'Media type'?: string;
//   Tags?: string;
//   Country?: string;
//   Language?: string;
//   Audience?: string;
//   Reach?: number;
//   Interactions?: string;
//   Notes?: string;
//   'Author name'?: string;
//   'Author handle (@username)'?: string;
//   'Author URL'?: string;
//   Gender?: string;
//   Age?: string;
//   Bio?: string;
//   City?: string;
//   Classification?: string;
//   Processed?: boolean;
//   Justification?: string;
// }

// @Injectable({ providedIn: 'root' })
// export class SupabaseService {

//   dbname: string = environment.dbName;

//   private clientPromise: Promise<any> | null = null;
//   private getClient() {
//     if (!this.clientPromise) {
//       this.clientPromise = import('@supabase/supabase-js').then(mod =>
//         mod.createClient(environment.supabaseUrl, environment.supabaseKey, {
//           auth: { persistSession: true, autoRefreshToken: true }
//         })
//       );
//     }
//     return this.clientPromise;
//   }

//   async getMentionCount(): Promise<{ count: number | null; error: any }> {
//     const supabase = await this.getClient();
//     return await supabase.from(this.dbname).select('*', { count: 'exact', head: true });
//   }

//   async getMentionsPaged(from: number, to: number): Promise<{ data: Mention[] | null; error: any }> {
//     const supabase = await this.getClient();
//     return await supabase
//       .from(this.dbname)
//       .select('*')
//       .order('id', { ascending: true })
//       .range(from, to);
//   }

//   async getMentions(): Promise<Mention[]> {
//     try {
//       const supabase = await this.getClient();
//       const { data, error } = await supabase
//         .from(this.dbname)
//         .select('*')
//         .order('id', { ascending: true });

//       if (error) {
//         console.error('Supabase error:', error.message);
//         return [];
//       }
//       return (data as Mention[]) || [];
//     } catch (e) {
//       console.error('Unexpected error while getting mentions:', e);
//       return [];
//     }
//   }

//   async getMentionById(id: number): Promise<Mention | null> {
//     const supabase = await this.getClient();
//     const { data, error } = await supabase.from(this.dbname).select('*').eq('id', id).single();
//     if (error || !data) return null;
//     return data as Mention;
//   }

//   async updateMention(id: number, updatedFields: Partial<Mention>): Promise<boolean> {
//     const supabase = await this.getClient();
//     const { error } = await supabase.from(this.dbname).update(updatedFields).eq('id', id);
//     if (error) console.error('Error updating mention:', error);
//     return !error;
//   }

//   async createMention(mention: Partial<Mention>): Promise<Mention | null> {
//     const supabase = await this.getClient();
//     const { data, error } = await supabase.from(this.dbname).insert([mention]).select().single();
//     if (error) {
//       console.error('Error creating mention:', error);
//       return null;
//     }
//     return data || null;
//   }

//   async deleteMention(id: number): Promise<boolean> {
//     const supabase = await this.getClient();
//     const { error } = await supabase.from(this.dbname).delete().eq('id', id);
//     if (error) console.error('Error deleting mention:', error);
//     return !error;
//   }

//   async getNextMentionId(): Promise<number> {
//     const supabase = await this.getClient();
//     const { data, error } = await supabase
//       .from(this.dbname)
//       .select('id')
//       .order('id', { ascending: false })
//       .limit(1);
//     if (error || !data || data.length === 0) return 1;
//     return Number((data[0] as any).id) + 1;
//   }

//   private normalizeProcessed(value: any): boolean | null {
//     if (value === true || value === false) return value;
//     if (value === 'true') return true;
//     if (value === 'false') return false;
//     return null;
//   }

//   private applyFilters(query: any, filters: any): any {
//     if (filters?.mediaType) {
//       query = query.eq('Media type', filters.mediaType);
//     }
//     if (filters?.classification) {
//       query = query.eq('Classification', filters.classification);
//     }

//     const processed = this.normalizeProcessed(filters?.processed);
//     if (processed !== null) {
//       query = query.eq('Processed', processed);
//     }

//     const rawTerm = (filters?.title ?? '').toString().trim();
//     if (rawTerm !== '') {
//       const safe = rawTerm.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
//       const pattern = `%${safe}%`;
//       query = query.or(`Title.ilike.${pattern},Detail.ilike.${pattern},Tags.ilike.${pattern}`);
//     }

//     return query;
//   }

//   async getMentionsFiltered(
//     from: number,
//     to: number,
//     filters: any,
//     sortColumn: string,
//     sortDirection: string
//   ): Promise<{ data: Mention[] | null; error: any }> {
//     const supabase = await this.getClient();

//     let query = supabase
//       .from(this.dbname)
//       .select('*', { count: 'exact' })
//       .range(from, to);

//     query = this.applyFilters(query, filters);

//     const allowedSorts = new Set([
//       'id',
//       'Title',
//       'Source',
//       'Update date',
//       'Publish date',
//       'Ranking',
//       'Media type',
//       'Sentiment',
//       'Classification',
//       'Processed'
//     ]);

//     if (sortColumn && allowedSorts.has(sortColumn)) {
//       query = query.order(sortColumn, {
//         ascending: sortDirection === 'asc',
//         nullsFirst: false
//       });
//     } else {
//       query = query.order('id', { ascending: true });
//     }

//     const { data, error } = await query;
//     return { data, error };
//   }

//   async getFilteredCount(filters: any): Promise<{ count: number; error: any }> {
//     const supabase = await this.getClient();

//     let query = supabase
//       .from(this.dbname)
//       .select('*', { count: 'exact', head: true });

//     query = this.applyFilters(query, filters);

//     const { count, error } = await query;
//     return { count: count ?? 0, error };
//   }

//   async getCountsBySentiment(): Promise<{ name: string; y: number }[]> {
//     const supabase = await this.getClient();

//     const { data, error } = await supabase
//       .from(this.dbname)
//       .select('Sentiment, count:count()');

//     if (error) {
//       console.error('getCountsBySentiment error:', error);
//       return [];
//     }

//     const points = (data ?? []).map((row: any) => ({
//       name: row.Sentiment ?? 'N/A',
//       y: Number(row.count) || 0
//     }));

//     points.sort((a, b) => b.y - a.y);
//     return points;
//   }

//   async getCountsByMediaType(): Promise<{ name: string; y: number }[]> {
//     const supabase = await this.getClient();

//     const { data, error } = await supabase
//       .from(this.dbname)
//       .select('"Media type", count:count()');

//     if (error) {
//       console.error('getCountsByMediaType error:', error);
//       return [];
//     }

//     const points = (data ?? []).map((row: any) => ({
//       name: row['Media type'] ?? 'N/A',
//       y: Number(row.count) || 0
//     }));

//     points.sort((a, b) => b.y - a.y);
//     return points;
//   }

//   async getCountsByClassification(): Promise<{ name: string; y: number }[]> {
//     const supabase = await this.getClient();

//     const { data, error } = await supabase
//       .from(this.dbname)
//       .select('Classification, count:count()');

//     if (error) {
//       console.error('getCountsByClassification error:', error);
//       return [];
//     }

//     const points = (data ?? []).map((row: any) => ({
//       name: row.Classification ?? 'N/A',
//       y: Number(row.count) || 0
//     }));

//     points.sort((a, b) => b.y - a.y);
//     return points;
//   }

//   async getProcessedAndTotal(): Promise<{ total: number; processed: number }> {
//     const supabase = await this.getClient();

//     const [totalRes, processedRes] = await Promise.all([
//       supabase.from(this.dbname).select('id', { count: 'exact', head: true }),
//       supabase.from(this.dbname).select('id', { count: 'exact', head: true }).eq('Processed', true),
//     ]);

//     if (totalRes.error) console.error('Total count error:', totalRes.error);
//     if (processedRes.error) console.error('Processed=true count error:', processedRes.error);

//     const total = totalRes.count ?? 0;
//     const processed = processedRes.count ?? 0;
//     return { total, processed: Math.min(processed, total) };
//   }

//   async getProcessedBreakdown(): Promise<{ name: string; y: number }[]> {
//     const { total, processed } = await this.getProcessedAndTotal();
//     const rest = Math.max(total - processed, 0);
//     return [
//       { name: 'Processed', y: processed },
//       { name: 'Not processed', y: rest },
//     ];
//   }

//   async getPublishDatesBetween(fromISO: string, toISO: string): Promise<string[]> {
//     const supabase = await this.getClient();
//     const { data, error } = await supabase
//       .from(this.dbname)
//       .select('"Publish date"')
//       .gte('Publish date', fromISO)
//       .lte('Publish date', toISO)
//       .order('Publish date', { ascending: true });

//     if (error) {
//       console.error('getPublishDatesBetween error:', error);
//       return [];
//     }
//     return (data ?? [])
//       .map((r: any) => r['Publish date'])
//       .filter(Boolean);
//   }

//   async getAllPublishDates(): Promise<string[]> {
//     const supabase = await this.getClient();
//     const { data, error } = await supabase
//       .from(this.dbname)
//       .select('"Publish date"')
//       .not('Publish date', 'is', null)
//       .order('Publish date', { ascending: true });

//     if (error) {
//       console.error('getAllPublishDates error:', error);
//       return [];
//     }
//     return (data ?? [])
//       .map((r: any) => r['Publish date'])
//       .filter(Boolean);
//   }

// }

import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

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
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  dbname: string = environment.dbName;

  private clientPromise: Promise<any> | null = null;
  private getClient() {
    if (!this.clientPromise) {
      this.clientPromise = import('@supabase/supabase-js').then(mod =>
        mod.createClient(environment.supabaseUrl, environment.supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        })
      );
    }
    return this.clientPromise;
  }

  async getMentionCount(): Promise<{ count: number | null; error: any }> {
    const supabase = await this.getClient();
    return await supabase.from(this.dbname).select('*', { count: 'exact', head: true });
  }

  async getMentionsPaged(from: number, to: number): Promise<{ data: Mention[] | null; error: any }> {
    const supabase = await this.getClient();
    return await supabase
      .from(this.dbname)
      .select('*')
      .order('id', { ascending: true })
      .range(from, to);
  }

  async getMentions(): Promise<Mention[]> {
    try {
      const supabase = await this.getClient();
      const { data, error } = await supabase
        .from(this.dbname)
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Supabase error:', error.message);
        return [];
      }
      return (data as Mention[]) || [];
    } catch (e) {
      console.error('Unexpected error while getting mentions:', e);
      return [];
    }
  }

  async getMentionById(id: number): Promise<Mention | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.from(this.dbname).select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as Mention;
  }

  async updateMention(id: number, updatedFields: Partial<Mention>): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase.from(this.dbname).update(updatedFields).eq('id', id);
    if (error) console.error('Error updating mention:', error);
    return !error;
  }

  async createMention(mention: Partial<Mention>): Promise<Mention | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.from(this.dbname).insert([mention]).select().single();
    if (error) {
      console.error('Error creating mention:', error);
      return null;
    }
    return data || null;
  }

  async deleteMention(id: number): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase.from(this.dbname).delete().eq('id', id);
    if (error) console.error('Error deleting mention:', error);
    return !error;
  }

  async getNextMentionId(): Promise<number> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from(this.dbname)
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return 1;
    return Number((data[0] as any).id) + 1;
  }

  private normalizeProcessed(value: any): boolean | null {
    if (value === true || value === false) return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  }

  private applyFilters(query: any, filters: any): any {
    if (filters?.mediaType) {
      query = query.eq('Media type', filters.mediaType);
    }
    if (filters?.classification) {
      query = query.eq('Classification', filters.classification);
    }

    const processed = this.normalizeProcessed(filters?.processed);
    if (processed !== null) {
      query = query.eq('Processed', processed);
    }

    const rawTerm = (filters?.title ?? '').toString().trim();
    if (rawTerm !== '') {
      const safe = rawTerm.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
      const pattern = `%${safe}%`;
      query = query.or(`Title.ilike.${pattern},Detail.ilike.${pattern},Tags.ilike.${pattern}`);
    }

    return query;
  }

  async getMentionsFiltered(
    from: number,
    to: number,
    filters: any,
    sortColumn: string,
    sortDirection: string
  ): Promise<{ data: Mention[] | null; error: any }> {
    const supabase = await this.getClient();

    let query = supabase
      .from(this.dbname)
      .select('*', { count: 'exact' })
      .range(from, to);

    query = this.applyFilters(query, filters);

    const allowedSorts = new Set([
      'id',
      'Title',
      'Source',
      'Update date',
      'Publish date',
      'Ranking',
      'Media type',
      'Sentiment',
      'Classification',
      'Processed'
    ]);

    if (sortColumn && allowedSorts.has(sortColumn)) {
      query = query.order(sortColumn, {
        ascending: sortDirection === 'asc',
        nullsFirst: false
      });
    } else {
      query = query.order('id', { ascending: true });
    }

    const { data, error } = await query;
    return { data, error };
  }

  async getFilteredCount(filters: any): Promise<{ count: number; error: any }> {
    const supabase = await this.getClient();

    let query = supabase
      .from(this.dbname)
      .select('*', { count: 'exact', head: true });

    query = this.applyFilters(query, filters);

    const { count, error } = await query;
    return { count: count ?? 0, error };
  }

  private quoteIfNeeded(column: string) {
    return /[^a-z0-9_]/i.test(column) && !/^".*"$/.test(column) ? `"${column}"` : column;
  }

  private async distinctValues(column: string): Promise<string[]> {
    const supabase = await this.getClient();
    const selectCol = this.quoteIfNeeded(column);

    type Row = Record<string, string | null>;

    const { data, error } = await supabase
      .from(this.dbname)
      .select(selectCol)
      .not(column, 'is', null)
      .order(column, { ascending: true });

    if (error) return [];

    const vals = ((data as Row[] | null) ?? [])
      .map((r: Row) => r[column] ?? null)
      .filter((v: string | null): v is string => v !== null);

    return Array.from(new Set(vals));
  }

  private async headCountEq(column: string, value: any): Promise<number> {
    const supabase = await this.getClient();
    const { count } = await supabase
      .from(this.dbname)
      .select('id', { count: 'exact', head: true })
      .eq(column, value);
    return count ?? 0;
  }

  async getCountsByMediaType(): Promise<{ name: string; y: number }[]> {
    const values: string[] = await this.distinctValues('Media type');
    const pairs = await Promise.all(
      values.map(async (v: string) => ({ name: v || 'N/A', y: await this.headCountEq('Media type', v) }))
    );
    return pairs.sort((a, b) => b.y - a.y);
  }

  async getCountsByClassification(): Promise<{ name: string; y: number }[]> {
    const values: string[] = await this.distinctValues('Classification');
    const pairs = await Promise.all(
      values.map(async (v: string) => ({ name: v || 'N/A', y: await this.headCountEq('Classification', v) }))
    );
    return pairs.sort((a, b) => b.y - a.y);
  }

  async getProcessedAndTotal(): Promise<{ total: number; processed: number }> {
    const supabase = await this.getClient();

    const [totalRes, processedRes] = await Promise.all([
      supabase.from(this.dbname).select('id', { count: 'exact', head: true }),
      supabase.from(this.dbname).select('id', { count: 'exact', head: true }).eq('Processed', true),
    ]);

    if (totalRes.error) console.error('Total count error:', totalRes.error);
    if (processedRes.error) console.error('Processed=true count error:', processedRes.error);

    const total = totalRes.count ?? 0;
    const processed = processedRes.count ?? 0;
    return { total, processed: Math.min(processed, total) };
  }

  async getProcessedBreakdown(): Promise<{ name: string; y: number }[]> {
    const { total, processed } = await this.getProcessedAndTotal();
    const rest = Math.max(total - processed, 0);
    return [
      { name: 'Processed', y: processed },
      { name: 'Not processed', y: rest },
    ];
  }

  async getAllPublishDates(): Promise<string[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from(this.dbname)
      .select('"Publish date"')
      .not('Publish date', 'is', null)
      .order('Publish date', { ascending: true });

    if (error) {
      console.error('getAllPublishDates error:', error);
      return [];
    }
    return (data ?? [])
      .map((r: any) => r['Publish date'])
      .filter(Boolean);
  }
}

