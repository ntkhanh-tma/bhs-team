import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AdminApiService } from '../admin-api.service';
import { CrudTableComponent } from '../shared/crud-table.component';
import { EntityConfig, FieldDef } from '../shared/crud-types';

/**
 * One component covering the eight lookup/calendar entities. Each is described
 * declaratively; the generic table does the rest.
 */
@Component({
  selector: 'app-admin-entity',
  standalone: true,
  imports: [CommonModule, CrudTableComponent],
  template: `
    <app-crud-table *ngIf="config" [config]="config" />
    <p *ngIf="!config" class="text-[#64748B]">Unknown section.</p>
  `,
})
export class AdminEntityComponent {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);

  config?: EntityConfig<{ id: string }>;

  constructor() {
    this.route.paramMap.subscribe(params => {
      this.config = this.build(params.get('entity') ?? '');
    });
  }

  private build(entity: string): EntityConfig<{ id: string }> | undefined {
    const api = this.api;

    switch (entity) {
      case 'teams':
        return {
          title: 'Teams',
          singular: 'team',
          description: 'The Team vocabulary that used to live in column A of the Database sheet.',
          fields: [
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'colorHex', label: 'Colour', kind: 'color' },
            { key: 'displayOrder', label: 'Order', kind: 'number' },
            { key: 'isActive', label: 'Active', kind: 'checkbox' },
          ],
          defaults: { name: '', colorHex: '#003bc4', displayOrder: 0, isActive: true },
          list: () => api.listTeams(),
          create: b => api.createTeam(b),
          update: (id, b) => api.updateTeam(id, b),
          remove: id => api.deleteTeam(id),
        } as EntityConfig<{ id: string }>;

      case 'positions':
        return {
          title: 'Positions',
          singular: 'position',
          description:
            'Job titles (the sheet called these "Role"). Clearing "Selectable in profile" ' +
            'replaces the old hardcoded EXCLUDED_ROLES list; "Hidden from directory" ' +
            'replaces the hardcoded manager filter on the members page.',
          fields: [
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'displayOrder', label: 'Order', kind: 'number' },
            { key: 'isActive', label: 'Active', kind: 'checkbox' },
            {
              key: 'isSelectableInProfile', label: 'Selectable in profile', kind: 'checkbox',
              hint: 'Members may choose this title for themselves.',
            },
            {
              key: 'isHiddenFromDirectory', label: 'Hidden from directory', kind: 'checkbox',
              hint: 'Holders do not appear on the Members page.',
            },
          ],
          defaults: {
            name: '', displayOrder: 0, isActive: true,
            isSelectableInProfile: true, isHiddenFromDirectory: false,
          },
          list: () => api.listPositions(),
          create: b => api.createPosition(b),
          update: (id, b) => api.updatePosition(id, b),
          remove: id => api.deletePosition(id),
        } as EntityConfig<{ id: string }>;

      case 'origins':
        return {
          title: 'Origins',
          singular: 'origin',
          description:
            'The DC / Origin vocabulary. Clearing "Selectable in profile" replaces the ' +
            'old hardcoded EXCLUDED_DCS list.',
          fields: [
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'displayOrder', label: 'Order', kind: 'number' },
            { key: 'isActive', label: 'Active', kind: 'checkbox' },
            { key: 'isSelectableInProfile', label: 'Selectable in profile', kind: 'checkbox' },
          ],
          defaults: { name: '', displayOrder: 0, isActive: true, isSelectableInProfile: true },
          list: () => api.listOrigins(),
          create: b => api.createOrigin(b),
          update: (id, b) => api.updateOrigin(id, b),
          remove: id => api.deleteOrigin(id),
        } as EntityConfig<{ id: string }>;

      case 'vacation-types':
        return {
          title: 'Vacation types',
          singular: 'vacation type',
          description:
            'Replaces the VALID_TYPES constant. Code is the single letter printed in each ' +
            'day cell of the history PNG export.',
          fields: [
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'code', label: 'Code', kind: 'text', required: true, hint: 'One letter, e.g. V' },
            { key: 'colorHex', label: 'Colour', kind: 'color' },
            { key: 'colorDarkHex', label: 'Dark colour', kind: 'color' },
            { key: 'displayOrder', label: 'Order', kind: 'number' },
            { key: 'isActive', label: 'Active', kind: 'checkbox' },
          ],
          defaults: {
            name: '', code: '', colorHex: '#8B5CF6', colorDarkHex: '#6D28D9',
            displayOrder: 0, isActive: true,
          },
          list: () => api.listVacationTypes(),
          create: b => api.createVacationType(b),
          update: (id, b) => api.updateVacationType(id, b),
          remove: id => api.deleteVacationType(id),
        } as EntityConfig<{ id: string }>;

      case 'countries':
        return {
          title: 'Countries',
          singular: 'country',
          description: 'Used to group the holidays page and to filter the sidebar feed.',
          fields: [
            { key: 'code', label: 'Code', kind: 'text', required: true, hint: 'e.g. VN' },
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'flagEmoji', label: 'Flag', kind: 'text' },
          ],
          defaults: { code: '', name: '', flagEmoji: '' },
          list: () => api.listCountries(),
          create: b => api.createCountry(b),
          update: (id, b) => api.updateCountry(id, b),
          remove: id => api.deleteCountry(id),
        } as EntityConfig<{ id: string }>;

      case 'holidays': {
        // The country picker is filled from the live country list on each load.
        const countryField: FieldDef = {
          key: 'countryId', label: 'Country', kind: 'select', hideInTable: true, options: [],
        };

        const config: EntityConfig<{ id: string }> = {
          title: 'Holidays',
          singular: 'holiday',
          description:
            'Public holidays. These block booking for the countries listed in ' +
            'Settings → sidebar.holidayCountryCodes.',
          fields: [
            { key: 'date', label: 'Date', kind: 'date', required: true },
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'country', label: 'Country', kind: 'text', readonly: true },
            countryField,
          ],
          defaults: { date: '', name: '', countryId: null },
          list: () => api.listCountries().pipe(
            switchMap(countries => {
              countryField.options = countries.map(
                c => ({ value: c.id, label: `${c.flagEmoji} ${c.name}` }));
              return api.listHolidays();
            }),
            map(holidays => holidays as { id: string }[]),
          ),
          create: b => api.createHoliday(b),
          update: (id, b) => api.updateHoliday(id, b),
          remove: id => api.deleteHoliday(id),
        };
        return config;
      }

      case 'release-plans':
        return {
          title: 'Release plans',
          singular: 'release',
          description: 'Shown as a 🚀 badge on the home calendar.',
          fields: [
            { key: 'date', label: 'Date', kind: 'date', required: true },
            { key: 'release', label: 'Release', kind: 'text', required: true },
          ],
          defaults: { date: '', release: '' },
          list: () => api.listReleasePlans(),
          create: b => api.createReleasePlan(b),
          update: (id, b) => api.updateReleasePlan(id, b),
          remove: id => api.deleteReleasePlan(id),
        } as EntityConfig<{ id: string }>;

      case 'event-plans':
        return {
          title: 'Event plans',
          singular: 'event',
          description: 'Shown as a 📅 badge on the home calendar.',
          fields: [
            { key: 'date', label: 'Date', kind: 'date', required: true },
            { key: 'description', label: 'Description', kind: 'text', required: true },
          ],
          defaults: { date: '', description: '' },
          list: () => api.listEventPlans(),
          create: b => api.createEventPlan(b),
          update: (id, b) => api.updateEventPlan(id, b),
          remove: id => api.deleteEventPlan(id),
        } as EntityConfig<{ id: string }>;

      default:
        return undefined;
    }
  }
}
