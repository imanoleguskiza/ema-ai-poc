import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MentionFormDialogComponent } from './mention-form-dialog.component';

describe('MentionFormDialogComponent', () => {
  let component: MentionFormDialogComponent;
  let fixture: ComponentFixture<MentionFormDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionFormDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MentionFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
