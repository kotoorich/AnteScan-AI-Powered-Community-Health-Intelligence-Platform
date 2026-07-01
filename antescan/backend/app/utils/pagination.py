"""Pagination utility."""
from flask import request


def paginate(query, default_per_page=20, max_per_page=100):
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(max_per_page, max(1, int(request.args.get('per_page', default_per_page))))
    pag = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': pag.items,
        'page': pag.page,
        'pages': pag.pages,
        'total': pag.total,
        'per_page': pag.per_page,
    }


def to_response(pagination, serializer):
    return {
        'items': [serializer(i) for i in pagination['items']],
        'page': pagination['page'],
        'pages': pagination['pages'],
        'total': pagination['total'],
        'perPage': pagination['per_page'],
    }
