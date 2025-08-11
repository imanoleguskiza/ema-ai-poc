
import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { getSupabaseClient } from './supabase-client.service';

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

@Injectable({
    providedIn: 'root'
})

export class SupabaseService {

    private supabase = inject(getSupabaseClient);

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    }

    async getMentionCount(): Promise<{ count: number | null; error: any }> {
    const { count, error } = await this.supabase
        .from('mentions')
        .select('*', { count: 'exact', head: true });

    return { count, error };
    }

    async getMentionsPaged(from: number, to: number): Promise<{ data: Mention[] | null; error: any }> {
    const { data, error } = await this.supabase
        .from('mentions')
        .select('*')
        .order('id', { ascending: true })
        .range(from, to);

    return { data, error };
    }



    async getMentions(): Promise<Mention[]> {
        try {
            const { data, error } = await this.supabase
            .from('mentions')
            .select('*')
            .order('id', { ascending: true });

            if (error) {
            console.error('Supabase error:', error.message);
            return [];
            }

            return data as Mention[];
        } catch (e) {
            console.error('Error inesperado al obtener menciones:', e);
            return [];
        }
    }

    async getMentionById(id: number): Promise<Mention | null> {
        const { data, error } = await this.supabase
            .from('mentions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(error);
            return null;
        }

        return {
            id: data.id,
            Title: data.Title,
            Detail: data.Detail,
            Link: data.Link,
            Source: data.Source,
            "Update date": data['Update date'],
            "Publish date": data['Publish date'],
            Sentiment: data.Sentiment,
            Ranking: data.Ranking,
            "Media type": data['Media type'],
            Tags: data.Tags,
            Country: data.Country,
            Language: data.Language,
            Audience: data.Audience,
            Reach: data.Reach,
            Interactions: data.Interactions,
            Notes: data.Notes,
            "Author name": data['Author name'],
            "Author handle (@username)": data['Author handle (@username)'],
            "Author URL": data['Author URL'],
            Gender: data.Gender,
            Age: data.Age,
            Bio: data.Bio,
            City: data.City
        };
    }

    async updateMention(id: number, updatedFields: Partial<Mention>): Promise<boolean> {
        const { error } = await this.supabase
            .from('mentions')
            .update(updatedFields)
            .eq('id', id);

        if (error) {
            console.error('Error actualizando mención:', error);
            return false;
        }

        return true;
    }

    async createMention(mention: Partial<Mention>): Promise<Mention | null> {
    const { data, error } = await this.supabase
        .from('mentions')
        .insert([mention])
        .select()
        .single();

    if (error) {
        console.error('Error creando mención:', error); // Asegurate de loguear el objeto completo
        return null;
    }

    return data;
    }


    async deleteMention(id: number): Promise<boolean> {
        const { error } = await this.supabase
            .from('mentions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error eliminando mención:', error);
            return false;
        }

        return true;
    }

    async getNextMentionId(): Promise<number> {
    const { data, error } = await this.supabase
        .from('mentions')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

        if (error || !data || data.length === 0) return 1;
        return Number(data[0].id) + 1;
    }




}
