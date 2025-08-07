import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullContentComponent } from './full-content.component';

describe('FullContentComponent', () => {
  let component: FullContentComponent;
  let fixture: ComponentFixture<FullContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullContentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
