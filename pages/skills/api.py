from flask import Blueprint, jsonify
from core.db import Database

def register_skills_api(app, db: Database):
    bp = Blueprint('skills_api', __name__, url_prefix='/api/skills')
    
    @bp.route('/recalc', methods=['POST'])
    def recalc_skills():
        try:
            skills = db.query("SELECT id, habit_id, minutes_per_unit FROM skills")
            for skill in skills:
                skill_id = skill['id']
                habit_id = skill['habit_id']
                minutes_per_unit = skill['minutes_per_unit']
                if habit_id is None or minutes_per_unit == 0:
                    continue
                rows = db.query("""
                    SELECT ch.quantity
                    FROM completion_habits ch
                    WHERE ch.habit_id = ? AND ch.success = 1
                """, (habit_id,))
                total_minutes = 0.0
                for row in rows:
                    # Каждая запись – одно выполнение, quantity не влияет
                    total_minutes += minutes_per_unit
                db.execute("UPDATE skills SET total_minutes = ? WHERE id = ?", (total_minutes, skill_id))
            db.commit()
            return jsonify({'status': 'success', 'message': 'Skills recalculated'})
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    # Дополнительно: получить навык с вычисленным уровнем
    @bp.route('/with-levels', methods=['GET'])
    def get_skills_with_levels():
        try:
            skills_rows = db.query("SELECT * FROM skills ORDER BY name")
            skills = []
            for row in skills_rows:
                total_minutes = row['total_minutes'] or 0.0
                level, level_name, next_minutes, progress = get_level_info(total_minutes)
                skills.append({
                    'id': row['id'],
                    'name': row['name'],
                    'habit_id': row['habit_id'],
                    'minutes_per_unit': row['minutes_per_unit'],
                    'total_minutes': total_minutes,
                    'total_hours': total_minutes / 60.0,
                    'level': level,
                    'level_name': level_name,
                    'next_level_minutes': next_minutes,
                    'progress_percent': progress,
                    'description': row['description']
                })
            return jsonify({'status': 'success', 'data': skills})
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500

    app.register_blueprint(bp)

def get_level_info(total_minutes):
    """Возвращает (уровень, название, минут до следующего уровня, % прогресса)"""
    MAX_MINUTES = 600000  # 10000 часов
    # 20 уровней
    level = min(20, int((total_minutes / MAX_MINUTES) * 20) + 1)
    if total_minutes >= MAX_MINUTES:
        return 20, "Профессор", MAX_MINUTES, 100.0
    
    # Процент в пределах текущего уровня
    level_min = (level - 1) * (MAX_MINUTES / 20)
    level_max = level * (MAX_MINUTES / 20)
    progress = ((total_minutes - level_min) / (level_max - level_min)) * 100 if level_max > level_min else 0
    next_minutes = level_max - total_minutes
    
    level_names = {
        1: "Новичок", 2: "Ученик", 3: "Подмастерье", 4: "Практикант",
        5: "Опытный ученик", 6: "Младший специалист", 7: "Специалист",
        8: "Продвинутый специалист", 9: "Эксперт", 10: "Мастер",
        11: "Профессионал", 12: "Ведущий профессионал", 13: "Эксперт высшего уровня",
        14: "Гуру", 15: "Визионер", 16: "Мастер-наставник", 17: "Элитный эксперт",
        18: "Легенда", 19: "Мастер легенд", 20: "Профессор"
    }
    return level, level_names.get(level, "Мастер"), next_minutes, progress