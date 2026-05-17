from sqlalchemy import func, literal, or_


def normalize_name_part(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned or None


def compose_full_name(
    first_name: str | None,
    middle_name: str | None,
    last_name: str | None,
    second_surname: str | None,
) -> str:
    return " ".join(
        part
        for part in (
            normalize_name_part(first_name),
            normalize_name_part(middle_name),
            normalize_name_part(last_name),
            normalize_name_part(second_surname),
        )
        if part
    )


def split_full_name(full_name: str | None) -> dict[str, str | None]:
    parts = (normalize_name_part(full_name) or "").split()
    if not parts:
        return {
            "first_name": None,
            "middle_name": None,
            "last_name": None,
            "second_surname": None,
        }
    if len(parts) == 1:
        return {
            "first_name": parts[0],
            "middle_name": None,
            "last_name": "Pendiente",
            "second_surname": None,
        }
    if len(parts) == 2:
        return {
            "first_name": parts[0],
            "middle_name": None,
            "last_name": parts[1],
            "second_surname": None,
        }
    if len(parts) == 3:
        return {
            "first_name": parts[0],
            "middle_name": None,
            "last_name": parts[1],
            "second_surname": parts[2],
        }
    return {
        "first_name": parts[0],
        "middle_name": " ".join(parts[1:-2]),
        "last_name": parts[-2],
        "second_surname": parts[-1],
    }


def apply_full_name_to_instance(instance, full_name: str | None) -> None:
    for field, value in split_full_name(full_name).items():
        setattr(instance, field, value)


def name_sort_columns(model):
    return (
        model.last_name,
        model.second_surname,
        model.first_name,
        model.middle_name,
    )


def full_name_expression(model):
    return func.trim(
        func.coalesce(model.first_name, "")
        + literal(" ")
        + func.coalesce(model.middle_name, "")
        + literal(" ")
        + func.coalesce(model.last_name, "")
        + literal(" ")
        + func.coalesce(model.second_surname, "")
    )


def name_search_filter(model, search_term: str):
    pattern = f"%{search_term}%"
    return or_(
        model.first_name.ilike(pattern),
        model.middle_name.ilike(pattern),
        model.last_name.ilike(pattern),
        model.second_surname.ilike(pattern),
        full_name_expression(model).ilike(pattern),
    )
