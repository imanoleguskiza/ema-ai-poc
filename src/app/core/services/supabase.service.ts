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
  private async getClient() {
    const mod = await import('@supabase/supabase-js');
    return mod.createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async getMentionCount(): Promise<{ count: number | null; error: any }> {
    const supabase = await this.getClient();
    return await supabase.from('mentions').select('*', { count: 'exact', head: true });
  }

  async getMentionsPaged(from: number, to: number): Promise<{ data: Mention[] | null; error: any }> {
    const supabase = await this.getClient();
    return await supabase
      .from('mentions')
      .select('*')
      .order('id', { ascending: true })
      .range(from, to);
  }

  async getMentions(): Promise<Mention[]> {
    try {
      const supabase = await this.getClient();
      const { data, error } = await supabase
        .from('mentions')
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
    const { data, error } = await supabase.from('mentions').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as Mention;
  }

  async updateMention(id: number, updatedFields: Partial<Mention>): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase.from('mentions').update(updatedFields).eq('id', id);
    if (error) console.error('Error updating mention:', error);
    return !error;
  }

  async createMention(mention: Partial<Mention>): Promise<Mention | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.from('mentions').insert([mention]).select().single();
    if (error) {
      console.error('Error creating mention:', error);
      return null;
    }
    return data || null;
  }

  async deleteMention(id: number): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase.from('mentions').delete().eq('id', id);
    if (error) console.error('Error deleting mention:', error);
    return !error;
  }

  async getNextMentionId(): Promise<number> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('mentions')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return 1;
    return Number((data[0] as any).id) + 1;
  }

  // ───────────────────────── helpers ─────────────────────────
  private normalizeProcessed(value: any): boolean | null {
    if (value === true || value === false) return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null; // '', null, undefined -> sin filtro
  }

  /** Aplica filtros comunes (incluye OR por Title/Detail/Tags). */
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

    // Búsqueda de texto en múltiples campos (Title OR Detail OR Tags)
    const rawTerm = (filters?.title ?? '').toString().trim();
    if (rawTerm !== '') {
      // saneamos caracteres que rompen el or=(...)
      const safe = rawTerm.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
      const pattern = `%${safe}%`;
      query = query.or(`Title.ilike.${pattern},Detail.ilike.${pattern},Tags.ilike.${pattern}`);
    }

    return query;
  }

  // ───────────────────────── filtros + ordenación ─────────────────────────
  async getMentionsFiltered(
    from: number,
    to: number,
    filters: any,
    sortColumn: string,
    sortDirection: string
  ): Promise<{ data: Mention[] | null; error: any }> {
    const supabase = await this.getClient();

    let query = supabase
      .from('mentions')
      .select('*', { count: 'exact' })
      .range(from, to);

    // filtros (incluye OR sobre Title/Detail/Tags si hay término)
    query = this.applyFilters(query, filters);

    // ordenación segura (whitelist)
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
      .from('mentions')
      .select('*', { count: 'exact', head: true });

    // mismos filtros para que el count coincida
    query = this.applyFilters(query, filters);

    const { count, error } = await query;
    return { count: count ?? 0, error };
  }
}
