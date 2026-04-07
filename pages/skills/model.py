from core.models import Entity, Field, FieldType

class Skill(Entity):
    __tablename__ = 'skills'
    __page_name__ = 'skills'
    __title__ = 'Навыки'
    _abstract = False

    fields = [
        Field('name', FieldType.STRING, required=True, label='Название навыка'),
        Field('habit_id', FieldType.INTEGER, label='ID привычки', required=False),
        Field('minutes_per_unit', FieldType.FLOAT, default=0.0, label='Минут за единицу привычки'),
        Field('total_minutes', FieldType.FLOAT, default=0.0, label='Всего минут'),
        Field('description', FieldType.TEXT, label='Описание'),
    ]