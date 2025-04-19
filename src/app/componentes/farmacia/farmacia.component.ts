import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FarmaciaService, Medicamento } from '../../servicios/farmacia.service';
import { Salida, SalidaDetalle } from '../../servicios/farmacia.service'; // ajusta el path

@Component({
  selector: 'app-farmacia',
  imports: [FormsModule, CommonModule],
  templateUrl: './farmacia.component.html',
  styleUrls: ['./farmacia.component.css']
})
export class FarmaciaComponent implements OnInit {
  ngOnInit() {
    this.cargarMedicamentos();
    this.cargarSalidas();
  }
  nuevoMedicamento = {
    codigo: '',
    nombre: '',
    imagen: '',
    precio: 0,
    estado: 'S',
    cantidad: 0,
    total: 0
  };

  errorVisible = false;
  correctoVisible = false;
  errorVisibleEditar = false;
  correctoVisibleEditar = false;
  medicamentos: Medicamento[] = [];
  salidas: Salida[] = [];
  @ViewChild('modalEditar') modalEditar!: ElementRef;
  medicamentoSeleccionado: Medicamento = this.crearMedicamentoVacio();
  private bootstrapModal: any;

  medicamentosFiltrados: Medicamento[] = [];
  carrito: Medicamento[] = [];
  terminoBusqueda: string = '';


  numeroDocumento = '';
  complemento = '';
  nombreCliente = '';
  tipopago = 'EFECTIVO'; 
  estado = 'S';
  constructor(private farmaciaService: FarmaciaService) {}
  
  guardarMedicamento(): void {
    if (!this.nuevoMedicamento.codigo || !this.nuevoMedicamento.nombre || !this.nuevoMedicamento.imagen || this.nuevoMedicamento.precio <= 0) {
      this.errorVisible = true;
      setTimeout(() => {
        this.errorVisible = false;
      }, 3000)
      return;
    }
    this.nuevoMedicamento.nombre = this.nuevoMedicamento.nombre.toUpperCase();
    this.farmaciaService.addMedicamento(this.nuevoMedicamento)
      .then((id) => {
        this.correctoVisible = true;
        setTimeout(() => {
          this.correctoVisible = false;
        }, 3000)
        this.cargarMedicamentos();
        this.resetFormulario();
      })
      .catch((error) => {
        console.error('Error al guardar el medicamento', error);
        alert('Hubo un error al registrar el medicamento.');
      });
  }
  async cargarMedicamentos(): Promise<void> {
    try {
      const list = await this.farmaciaService.getMedicamentosActivos();
      console.log('Datos recibidos:', list);
      this.medicamentos = list;
      this.medicamentosFiltrados = [...list];
    } catch (err) {
      console.error('Error al cargar:', err);
      this.medicamentos = [];
      this.medicamentosFiltrados = [];
    }
  }
  async cargarSalidas(): Promise<void> {
    try {
      const list = await this.farmaciaService.getSalidasActivas();
      console.log('Datos recibidos:', list);
      this.salidas = list;
    } catch (err) {
      console.error('Error al cargar:', err);
      this.salidas = [];
    }
  }

  abrirModalEditar(med: Medicamento): void {
    this.medicamentoSeleccionado = { ...med };
    this.mostrarModal();
  }

  private mostrarModal(): void {
    if (!this.bootstrapModal) {
    }
    this.bootstrapModal.show();
  }

  cerrarModal(): void {
    if (this.bootstrapModal) {
      this.bootstrapModal.hide();
    }
    this.resetMensajes(); 
  }

  async guardarEdicion(): Promise<void> {
    const m = this.medicamentoSeleccionado;
    
    if (!m.codigo || !m.nombre || !m.imagen || m.precio <= 0) {
      this.mostrarErrorTemporal();
      return;
    }

    try {
      await this.farmaciaService.updateMedicamento(m);
      this.correctoVisibleEditar = true;
      setTimeout(() => {
        this.correctoVisibleEditar = false;
      }, 3000)
      this.cargarMedicamentos();

    } catch (err) {
      console.error('Error al editar:', err);
      this.mostrarErrorTemporal('Error al guardar cambios');
    }
  }

  private crearMedicamentoVacio(): Medicamento {
    return {
      codigo: '',
      nombre: '',
      imagen: '',
      precio: 0,
      estado: 'S',cantidad: 0,
      total: 0
    };
  }

  private resetMensajes(): void {
    this.errorVisibleEditar = false;
    this.correctoVisibleEditar = false;
  }

  private mostrarErrorTemporal(mensaje?: string): void {
    this.errorVisibleEditar = true;
    setTimeout(() => this.resetMensajes(), 3000);
  }
  eliminarMedicamento(med: Medicamento): void {
    if (!med.id) return;
    if (!confirm(`¿Seguro que deseas eliminar "${med.nombre}"?`)) return;

    this.farmaciaService.eliminarLogicoMedicamento(med.id)
      .then(() => this.cargarMedicamentos())
      .catch(err => console.error('Error al eliminar:', err));
  }
  eliminarSalida(sal: Salida): void {
    if (!sal.id) return;
    if (!confirm(`¿Seguro que deseas eliminar la salida?`)) return;

    this.farmaciaService.eliminarLogicoSalida(sal.id)
      .then(() => this.cargarSalidas())
      .catch(err => console.error('Error al eliminar:', err));
  }
  
  filtrarMedicamentos(): void {
    if (!this.terminoBusqueda) {
      this.medicamentosFiltrados = [...this.medicamentos];
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase();
    this.medicamentosFiltrados = this.medicamentos.filter(med => 
      med.nombre.toLowerCase().includes(termino) || 
      med.codigo.toLowerCase().includes(termino)
    );
  }
  estaEnCarrito(medicamento: Medicamento): boolean {
    return this.carrito.some(m => m.id === medicamento.id);
  }
  agregarAlCarrito(medicamento: Medicamento): void {
    const existe = this.carrito.some(m => m.id === medicamento.id);
    if (!existe) {
      const cantidad = parseInt(prompt('Ingrese la cantidad:', '1') || '1', 10);
      if (!isNaN(cantidad) && cantidad > 0) {
        this.carrito.push({
          ...medicamento,
          cantidad,
          total: medicamento.precio * cantidad
        });
      } else {
        alert('Cantidad inválida.');
      }
    }
  }
  

  quitarDelCarrito(medicamento: Medicamento): void {
    this.carrito = this.carrito.filter(m => m.id !== medicamento.id);
  }
  obtenerTotalGeneral(): number {
    return this.carrito.reduce((acc, med) => acc + med.total, 0);
  }
  
  // Resetear los campos del formulario
  private resetFormulario(): void {
    this.nuevoMedicamento = { codigo: '', nombre: '', imagen: '', precio: 0, estado: 'S',cantidad: 0,
      total: 0 };
  }

  async guardarSalida(): Promise<void> {
    // Validaciones
    if (this.carrito.length === 0) {
      alert('No hay medicamentos en el carrito.');
      return;
    }
    
    if (!this.numeroDocumento || !this.nombreCliente) {
      alert('Número de documento y nombre son obligatorios');
      return;
    }
  
    try {
      const salida: Omit<Salida, 'id'> = {
        fecha: new Date(),
        total: this.obtenerTotalGeneral(),
        numeroDocumento: this.numeroDocumento,
        complemento: this.complemento || '',
        nombreCliente: this.nombreCliente.toUpperCase(), 
        tipopago: this.tipopago,
        estado: 'S'
      };
      
  
      const salidaId = await this.farmaciaService.addSalida(salida);
      
      const detalles: Omit<SalidaDetalle, 'id'>[] = this.carrito.map(med => ({
        salidaId,
        medicamentoId: med.id ?? 0,
        cantidad: med.cantidad,
        precioUnitario: med.precio,
        precioTotal: med.precio * med.cantidad 
      }));
  
      await this.farmaciaService.addDetallesBatch(detalles);
  
      // Limpieza
      this.limpiarFormulario();
      this.correctoVisible = true;
      setTimeout(() => this.correctoVisible = false, 3000);
      this.cargarSalidas();
      
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al registrar la salida');
    }
  }
  
  limpiarFormulario(): void {
    this.carrito = [];
    this.numeroDocumento = '';
    this.complemento = '';
    this.nombreCliente = '';
    this.tipopago = 'EFECTIVO';
  }
  

  async imprimirSalida(salida: Salida) {
    if (!salida.id) return;
  
    try {
      // 1. Traer detalles de la salida
      const detalles = await this.farmaciaService.getDetallesBySalidaId(salida.id);
  
      // 2. Traer nombre de medicamento en paralelo
      //    (puedes omitir esta parte y mostrar solo el ID si prefieres)
      const detallesConNombre = await Promise.all(
        detalles.map(async d => {
          const med = await this.farmaciaService.getMedicamentoById(d.medicamentoId);
          return { ...d, nombre: med.nombre };
        })
      );

      // 3. Construir el HTML del ticket
      const estilo = `
      <style>
        @media print {
          @page {
            size: 80mm auto;   /* Ancho fijo de 80mm, alto automático */
            margin: 2mm 0;     /* Márgenes muy reducidos */
            padding: 0;
          }
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 78mm !important; 
          margin: 0 auto !important;
          padding: 2mm !important;
          line-height: 1.1;
        }
        .ticket {
          transform: scale(2);
          transform-origin: top left;
         
        }
        .cabecera {
          text-align: center;
          margin: 0 0 4px 0;
          padding: 0;
        }
  
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 2px 0;
        }
  
        th, td {
          padding: 0;
          font-size: 10px !important;
        }
        .text-end {
          text-align: right;
        }
  
        .totales {
          font-weight: bold;
          border-top: 1px dashed #000;
          margin-top: 4px;
          padding-top: 2px;
          text-align: right;
        }
      </style>
      <meta name="viewport" content="width=78mm, initial-scale=1.0">
      <meta name="pdf-creator" content="thermal-print">
    `;
  
      let html = `<html><head><title>Ticket</title>${estilo}</head><body>`;
      html += `<div class="cabecera">
                 <div>FARMACIA SiFAR</div>
                 <div>Cliente: ${salida.nombreCliente.toUpperCase()}</div>
                 <div>Doc: ${salida.numeroDocumento} ${salida.complemento}</div>
                 <div>${new Date(salida.fecha).toLocaleString('es-BO')}</div>
               </div>`;
  
      html += `<table>
                 <tr><th>Producto</th><th>Precio unitario</th><th>Cantidad</th><th class="text-end">Importe</th></tr>`;
      detallesConNombre.forEach(d => {
        html += `<tr>
                   <td>${d.nombre}</td>
                    <td style="text-align:center;">${d.precioUnitario.toFixed(2)}</td>
                   <td style="text-align:center;">${d.cantidad}</td>
                   <td class="text-end">${d.precioTotal.toFixed(2)} Bs.</td>
                 </tr>`;
      });
      html += `</table>`;
  
      html += `
      
      <div class="totales">
                 TOTAL: ${salida.total.toFixed(2)} Bs.
               </div>`;
      html += `</body></html>`;
  
      // 4. Abrir ventana de impresión
      const printWindow = window.open('', '_blank', 
        `width=960,height=${screen.height * 0.7},`
        + 'scrollbars=no,status=no,toolbar=no');
    
      if (!printWindow) throw new Error('Error al abrir ventana de impresión');
      
      printWindow.document.write(html);
      printWindow.document.close();
    
      // Delay crucial para renderizado correcto
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Cierre diferido para evitar bloqueos
        setTimeout(() => {
          try { printWindow.close(); } 
          catch(e) { console.log('Cierre seguro de ventana'); }
        }, 500);
        
      }, 350); // Aumentamos el delay para navegadores pesados
  
    } catch (error) {
      console.error('Error imprimiendo ticket:', error);
      alert('No se pudo generar el ticket.');
    }
  }
}
