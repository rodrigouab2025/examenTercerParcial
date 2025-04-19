import { Injectable } from '@angular/core';

export interface Medicamento {
  id?: number;
  codigo: string;
  nombre: string;
  imagen: string;
  precio: number;
  estado: string;
  cantidad: number;
  total: number;
}

export interface Salida {
  id?: number;
  fecha: Date;
  total: number;
  numeroDocumento: string;
  complemento: string;
  nombreCliente: string;
  tipopago: string;
  estado: string;
}

export interface SalidaDetalle {
  id?: number;
  salidaId: number;
  medicamentoId: number;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
}

@Injectable({ providedIn: 'root' })
export class FarmaciaService {
  private readonly dbName = 'FarmaciaDB';
  private readonly dbVersion = 1;
  private db!: IDBDatabase;
  private dbReady: Promise<void>;
  constructor() {
    this.dbReady = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
  
      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        console.log('IndexedDB listo');
        resolve(); // Resuelve la promesa cuando la DB está lista
      };
  
      request.onerror = (event) => {
        console.error('Error al abrir DB:', request.error);
        reject(request.error);
      };
  
      request.onupgradeneeded = (event: any) => {
        // ... (tu código actual de onupgradeneeded)
      };
    });
  }

  private initDB(): void {
    const request = indexedDB.open(this.dbName, this.dbVersion);

    request.onsuccess = (event: any) => {
      this.db = event.target.result;
      console.log('IndexedDB listo');
      // Opcional: Ejecutar una carga inicial de prueba
      this.getMedicamentosActivos().then(meds => 
        console.log('Medicamentos en DB:', meds)
      );
    };

    request.onupgradeneeded = (event: any) => {
      this.db = event.target.result;

      if (!this.db.objectStoreNames.contains('medicamentos')) {
        const store = this.db.createObjectStore('medicamentos', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('by_nombre', 'nombre', { unique: false });
        store.createIndex('by_estado', 'estado', { unique: false });
      }

      if (!this.db.objectStoreNames.contains('salidas')) {
        const store = this.db.createObjectStore('salidas', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_fecha', 'fecha', { unique: false });
      }

      if (!this.db.objectStoreNames.contains('salidadetalle')) {
        const store = this.db.createObjectStore('salidadetalle', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_salida', 'salidaId', { unique: false });
        store.createIndex('by_medicamento', 'medicamentoId', { unique: false });
      }
    };
  }

  addMedicamento(med: Omit<Medicamento, 'id'>): Promise<number> {
    const tx = this.db.transaction('medicamentos', 'readwrite');
    const store = tx.objectStore('medicamentos');
    return new Promise((resolve, reject) => {
      const req = store.add(med);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }
  addSalida(salida: Omit<Salida, 'id'>): Promise<number> {
    const tx = this.db.transaction('salidas', 'readwrite');
    const store = tx.objectStore('salidas');
    return new Promise((resolve, reject) => {
      const req = store.add(salida);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }
  addDetallesBatch(detalles: Omit<SalidaDetalle, 'id'>[]): Promise<void> {
    const tx = this.db.transaction('salidadetalle', 'readwrite');
    const store = tx.objectStore('salidadetalle');
  
    return new Promise((resolve, reject) => {
      let count = 0;
      for (const detalle of detalles) {
        const req = store.add(detalle);
        req.onsuccess = () => {
          count++;
          if (count === detalles.length) resolve();
        };
        req.onerror = () => reject(req.error);
      }
    });
  }
  
  // En FarmaciaService
  async getMedicamentosActivos(): Promise<Medicamento[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('medicamentos', 'readonly');
      const store = tx.objectStore('medicamentos');
      const request = store.getAll();

      request.onsuccess = () => {
        const activos = request.result.filter(med => med.estado === 'S');
        resolve(activos);
      };
      request.onerror = () => reject(request.error);
    });
  }
  async getSalidasActivas(): Promise<Salida[]> {
    await this.dbReady;
  
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('salidas', 'readonly');
      const store = tx.objectStore('salidas');
      const request = store.getAll();
  
      request.onsuccess = () => {
        const activos = request.result
          .filter(sal => sal.estado === 'S')
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  
        resolve(activos);
      };
  
      request.onerror = () => reject(request.error);
    });
  }
  
  
  async updateMedicamento(med: Medicamento): Promise<void> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('medicamentos', 'readwrite');
      const store = tx.objectStore('medicamentos');
      const req = store.put(med);
      
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  
  async eliminarLogicoMedicamento(id: number): Promise<void> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('medicamentos', 'readwrite');
      const store = tx.objectStore('medicamentos');
      
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const rec = getReq.result;
        if (!rec) {
          reject(new Error(`Medicamento con ID ${id} no encontrado`));
          return;
        }
        
        rec.estado = 'N';
        const updateReq = store.put(rec);
        updateReq.onsuccess = () => resolve();
        updateReq.onerror = () => reject(updateReq.error);
      };
      
      getReq.onerror = () => reject(getReq.error);
    });
  }
  async eliminarLogicoSalida(id: number): Promise<void> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('salidas', 'readwrite');
      const store = tx.objectStore('salidas');
      
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const rec = getReq.result;
        if (!rec) {
          reject(new Error(`Salida con ID ${id} no encontrado`));
          return;
        }
        
        rec.estado = 'N';
        const updateReq = store.put(rec);
        updateReq.onsuccess = () => resolve();
        updateReq.onerror = () => reject(updateReq.error);
      };
      
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async getDetallesBySalidaId(salidaId: number): Promise<SalidaDetalle[]> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('salidadetalle', 'readonly');
      const store = tx.objectStore('salidadetalle');
      const req = store.getAll();
      req.onsuccess = () => {
        const detalles = (req.result as SalidaDetalle[])
          .filter(d => d.salidaId === salidaId);
        resolve(detalles);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getMedicamentoById(id: number): Promise<Medicamento> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('medicamentos', 'readonly');
      const store = tx.objectStore('medicamentos');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as Medicamento);
      req.onerror = () => reject(req.error);
    });
  }

}
