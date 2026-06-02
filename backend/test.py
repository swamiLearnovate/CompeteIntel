from app.services.competitor_discovery import CompetitorDiscovery

discovery = CompetitorDiscovery()

result = discovery.discover_as_dict(
    product_name="Flexible Ducts with Insulation",
    competitor_region="United States",
    product_analysis={
        "category": "HVAC Ducting / Insulation",
        "target_users": ["HVAC contractors", "building owners"],
        "core_features": ["flexible ducts", "insulation"],
        "value_proposition": "thermal efficiency and air distribution"
    },
    website_text="..."
)

print(result["result"])