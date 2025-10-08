def snake_to_camel(original):
    parts = original.split("_")

    camel_cased = parts[0].lower() + "".join(p.title() for p in parts[1:])

    return camel_cased
