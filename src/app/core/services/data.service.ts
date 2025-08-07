import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Papa from 'papaparse';
import { firstValueFrom } from 'rxjs';

export interface Thing {
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor(private http: HttpClient) {}

  async getThings(): Promise<Thing[]> {
    try {
      const csvData = await firstValueFrom(this.http.get('assets/mentions.csv', { responseType: 'text' }));

      return new Promise((resolve, reject) => {
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (result: { data: Thing[]; }) => {
            const parsedData = result.data as Thing[];

            // Convert fields (if needed)
            const things: Thing[] = parsedData.map(item => ({
              id: Number(item.id)
            }));

            resolve(things);
          },
          error: (error: any) => reject(error)
        });
      });

    } catch (error) {
      console.error('Error loading CSV:', error);
      return [];
    }
  }
}
