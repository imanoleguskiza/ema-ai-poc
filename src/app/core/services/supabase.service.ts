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
      console.error('Error inesperado al obtener menciones:', e);
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
    const { error } = await supabase
      .from('mentions')
      .update(updatedFields)
      .eq('id', id);
    if (error) console.error('Error actualizando mención:', error);
    return !error;
  }

  async createMention(mention: Partial<Mention>): Promise<Mention | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.from('mentions').insert([mention]).select().single();
    if (error) {
      console.error('Error creando mención:', error);
      return null;
    }
    return data || null;
  }

  async deleteMention(id: number): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase.from('mentions').delete().eq('id', id);
    if (error) console.error('Error eliminando mención:', error);
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
}
